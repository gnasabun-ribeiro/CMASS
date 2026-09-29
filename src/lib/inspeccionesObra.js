import { supabase } from "./supabaseClient.js";

// El id lo genera el dispositivo (así se puede trabajar sin conexión). Es repetible:
// si la fila ya existe, no hace nada.
export async function crearBorradorObra(inspectorId, id) {
  const { error } = await supabase
    .from("inspecciones_obra")
    .upsert({ id, inspector_id: inspectorId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function guardarGeneralesObra(inspeccionId, generales) {
  const { error } = await supabase
    .from("inspecciones_obra")
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

export async function guardarRespuestaChecklist(inspeccionId, item, valor) {
  const { error } = await supabase.from("inspecciones_obra_checklist").upsert(
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

export async function marcarEnviadaObra(inspeccionId) {
  const { error } = await supabase.from("inspecciones_obra").update({ estado: "enviado" }).eq("id", inspeccionId);
  if (error) throw error;
}

// Repetible: el hallazgo trae el id generado en el dispositivo; si ya existe, no se duplica.
export async function agregarHallazgoObra(inspeccionId, h) {
  const { error } = await supabase.from("inspecciones_obra_hallazgos").upsert(
    {
      id: h.id,
      inspeccion_id: inspeccionId,
      titulo: h.titulo,
      severidad: h.severidad,
      detalle: h.detalle || null,
      responsable: h.responsable || null,
      vence: h.vence || null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (error) throw error;
  return h.id;
}

export async function borrarHallazgoObra(hallazgoId) {
  const { error } = await supabase.from("inspecciones_obra_hallazgos").delete().eq("id", hallazgoId);
  if (error) throw error;
}

// Listado para "Registros": cabecera + cantidad de hallazgos y de respuestas.
export async function listarInspeccionesObra() {
  const { data, error } = await supabase
    .from("inspecciones_obra")
    .select(
      "id, cliente, ubicacion, grupo_auditado, tarea_observada, fecha_hora, estado, created_at, hallazgos:inspecciones_obra_hallazgos(count), respuestas:inspecciones_obra_checklist(count)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    ...r,
    hallazgos: r.hallazgos?.[0]?.count ?? 0,
    respuestas: r.respuestas?.[0]?.count ?? 0,
  }));
}

// Carga una inspección completa para retomarla en el formulario.
export async function cargarInspeccionObra(inspeccionId) {
  const [cab, resp, hall] = await Promise.all([
    supabase.from("inspecciones_obra").select("*").eq("id", inspeccionId).single(),
    supabase.from("inspecciones_obra_checklist").select("codigo, valor, foto_url").eq("inspeccion_id", inspeccionId),
    supabase.from("inspecciones_obra_hallazgos").select("*").eq("inspeccion_id", inspeccionId).order("created_at"),
  ]);
  if (cab.error) throw cab.error;
  if (resp.error) throw resp.error;
  if (hall.error) throw hall.error;
  const c = cab.data;
  // datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local
  const f = c.fecha_hora ? new Date(c.fecha_hora) : null;
  const pad = (n) => String(n).padStart(2, "0");
  const fechaHora = f ? `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T${pad(f.getHours())}:${pad(f.getMinutes())}` : "";
  return {
    estado: c.estado,
    inspectorId: c.inspector_id,
    generales: {
      cliente: c.cliente || "",
      ubicacion: c.ubicacion || "",
      grupoAuditado: c.grupo_auditado || "",
      fechaHora,
      tareaObservada: c.tarea_observada || "",
    },
    respuestas: Object.fromEntries(resp.data.map((r) => [r.codigo, r.valor])),
    fotos: Object.fromEntries(resp.data.filter((r) => r.foto_url).map((r) => [r.codigo, r.foto_url])),
    hallazgos: hall.data,
  };
}
