import { supabase } from "./supabaseClient.js";

// Acceso a datos en Supabase. Todas reciben `t` (ver tablas.js) para servir tanto a
// Obra Pública como a los demás módulos. Las ejecuta sync.js; la UI no las llama directo.

// El id lo genera el dispositivo (así se puede trabajar sin conexión). Es repetible:
// si la fila ya existe, no hace nada.
export async function crearBorrador(t, { id, inspectorId, moduloId, subId }) {
  const fila = { id, inspector_id: inspectorId };
  if (t.generico) Object.assign(fila, { modulo_id: moduloId, sub_id: subId || null });
  const { error } = await supabase.from(t.cab).upsert(fila, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function guardarGenerales(t, inspeccionId, generales) {
  const { error } = await supabase
    .from(t.cab)
    .update({
      cliente: generales.cliente || null,
      ubicacion: generales.ubicacion || null,
      grupo_auditado: generales.grupoAuditado || null,
      fecha_hora: generales.fechaHora ? new Date(generales.fechaHora).toISOString() : null,
      tarea_observada: generales.tareaObservada || null,
    })
    .eq("id", inspeccionId);
  if (error) throw error;
}

export async function guardarRespuestaChecklist(t, inspeccionId, item, valor) {
  const { error } = await supabase.from(t.checklist).upsert(
    {
      inspeccion_id: inspeccionId,
      codigo: item.codigo,
      categoria: item.categoria,
      item: item.texto,
      valor,
    },
    { onConflict: "inspeccion_id,codigo" }
  );
  if (error) throw error;
}

export async function marcarEnviada(t, inspeccionId) {
  const { error } = await supabase.from(t.cab).update({ estado: "enviado" }).eq("id", inspeccionId);
  if (error) throw error;
}

// Las columnas de correo las agrega supabase/informes_destinatarios.sql. Mientras ese SQL
// no se haya ejecutado, se guarda igual sin ellas en vez de trabar la sincronización.
export const faltaColumna = (error, columna) =>
  Boolean(error) && ["PGRST204", "42703"].includes(error.code) && String(error.message).includes(columna);

// Repetible: el hallazgo trae el id generado en el dispositivo; si ya existe, no se duplica.
export async function agregarHallazgo(t, inspeccionId, h) {
  const fila = {
    id: h.id,
    inspeccion_id: inspeccionId,
    titulo: h.titulo,
    severidad: h.severidad,
    detalle: h.detalle || null,
    responsable: h.responsable || null,
    vence: h.vence || null,
  };
  const guardar = (f) => supabase.from(t.hallazgos).upsert(f, { onConflict: "id", ignoreDuplicates: true });
  let { error } = await guardar({ ...fila, responsable_correo: h.correo || null });
  if (faltaColumna(error, "responsable_correo")) ({ error } = await guardar(fila));
  if (error) throw error;
  return h.id;
}

// Al cerrar la inspección deja un renglón por persona que debe recibir el informe: el
// responsable del área (firma) y los responsables de los hallazgos, con el correo que
// se asoció al elegirlos de la lista de colaboradores. Es la cola de salida: el envío
// real (Resend) todavía no está conectado y leerá las filas con estado 'pendiente'.
// Repetible: (inspeccion_id, correo) es único.
export async function registrarDestinatarios(t, rec) {
  const porCorreo = new Map();
  const sumar = (correo, nombre, rol) => {
    const c = (correo || "").trim().toLowerCase();
    if (c && !porCorreo.has(c)) porCorreo.set(c, { correo: c, nombre: nombre || null, rol });
  };
  sumar(rec.firmas?.responsable?.correo, rec.firmas?.responsable?.nombre, "responsable");
  for (const h of rec.hallazgos ?? []) sumar(h.correo, h.responsable, "hallazgo");
  if (!porCorreo.size) return;

  const filas = [...porCorreo.values()].map((d) => ({
    inspeccion_id: rec.id,
    modulo_id: t.generico ? rec.moduloId : "obra",
    ...d,
  }));
  const { error } = await supabase.from("informes_envios").upsert(filas, { onConflict: "inspeccion_id,correo", ignoreDuplicates: true });
  // Tabla todavía no creada: la inspección igual se envía; los correos se pueden
  // reconstruir después porque quedan guardados en hallazgos y firmas.
  if (error && ["PGRST205", "42P01"].includes(error.code)) {
    console.warn("informes_envios no existe todavía: ejecutá supabase/informes_destinatarios.sql");
    return;
  }
  if (error) throw error;
}

export async function borrarHallazgo(t, hallazgoId) {
  const { error } = await supabase.from(t.hallazgos).delete().eq("id", hallazgoId);
  if (error) throw error;
}

// Listado para "Registros": cabecera + cantidad de hallazgos y de respuestas.
// En las tablas genéricas se puede filtrar por módulo y sub-módulo.
export async function listarInspecciones(t, { moduloId, subId } = {}) {
  const columnas = `id, cliente, ubicacion, grupo_auditado, tarea_observada, fecha_hora, estado, created_at, hallazgos:${t.hallazgos}(count), respuestas:${t.checklist}(count)`;
  let consulta = supabase
    .from(t.cab)
    .select(t.generico ? `${columnas}, modulo_id, sub_id` : columnas)
    .order("created_at", { ascending: false });
  if (t.generico && moduloId) consulta = consulta.eq("modulo_id", moduloId);
  if (t.generico && subId) consulta = consulta.eq("sub_id", subId);
  const { data, error } = await consulta;
  if (error) throw error;
  return data.map((r) => ({
    ...r,
    moduloId: t.generico ? r.modulo_id : "obra",
    subId: t.generico ? r.sub_id : null,
    hallazgos: r.hallazgos?.[0]?.count ?? 0,
    respuestas: r.respuestas?.[0]?.count ?? 0,
  }));
}

// Carga una inspección completa para retomarla en el formulario.
export async function cargarInspeccionRemota(t, inspeccionId) {
  const [cab, resp, hall, fot] = await Promise.all([
    supabase.from(t.cab).select("*").eq("id", inspeccionId).single(),
    supabase.from(t.checklist).select("codigo, valor").eq("inspeccion_id", inspeccionId),
    supabase.from(t.hallazgos).select("*").eq("inspeccion_id", inspeccionId).order("created_at"),
    supabase.from(t.fotos).select("id, ruta").eq("inspeccion_id", inspeccionId).order("created_at"),
  ]);
  if (cab.error) throw cab.error;
  if (resp.error) throw resp.error;
  if (hall.error) throw hall.error;
  if (fot.error) throw fot.error;
  const c = cab.data;
  // datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local
  const f = c.fecha_hora ? new Date(c.fecha_hora) : null;
  const pad = (n) => String(n).padStart(2, "0");
  const fechaHora = f ? `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T${pad(f.getHours())}:${pad(f.getMinutes())}` : "";
  return {
    estado: c.estado,
    inspectorId: c.inspector_id,
    moduloId: t.generico ? c.modulo_id : "obra",
    subId: t.generico ? c.sub_id : null,
    generales: {
      cliente: c.cliente || "",
      ubicacion: c.ubicacion || "",
      grupoAuditado: c.grupo_auditado || "",
      fechaHora,
      tareaObservada: c.tarea_observada || "",
    },
    respuestas: Object.fromEntries(resp.data.map((r) => [r.codigo, r.valor])),
    galeria: fot.data,
    hallazgos: hall.data,
  };
}
