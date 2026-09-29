import { borrarOpsDe, encolar, enSerie, guardarInspeccion, obtenerInspeccion, obtenerOp } from "./localDb.js";
import { agendarSync } from "./sync.js";
import { cargarInspeccionObra } from "./inspeccionesObra.js";
import { listarFirmasObra } from "./firmasObra.js";

// API que usa el formulario: todo se escribe primero en el dispositivo y se
// encola para subirlo a Supabase apenas haya conexión (ver sync.js).

const GENERALES_VACIOS = { cliente: "", ubicacion: "", grupoAuditado: "", fechaHora: "", tareaObservada: "" };

// Guarda la copia local y encola las operaciones. Si la inspección todavía no
// existe en el servidor, antepone "crear" (solo se sube cuando hay algo que subir).
async function confirmar(rec, ops) {
  await guardarInspeccion(rec);
  if (ops.length && !rec.enServidor) await encolar({ inspeccionId: rec.id, tipo: "crear" });
  for (const op of ops) await encolar({ inspeccionId: rec.id, ...op });
  agendarSync();
}

// Aplica un cambio a la copia local de forma serializada.
function modificar(id, fn) {
  return enSerie(async () => {
    const rec = await obtenerInspeccion(id);
    if (!rec) throw new Error("La inspección no existe en este dispositivo");
    const ops = await fn(rec);
    await confirmar(rec, ops || []);
    return rec;
  });
}

export async function nuevaInspeccion(inspectorId) {
  const rec = {
    id: crypto.randomUUID(),
    inspectorId,
    enServidor: false,
    estado: "borrador",
    generales: { ...GENERALES_VACIOS },
    respuestas: {}, // codigo -> { valor, categoria, texto }
    hallazgos: [], // { id, titulo, severidad, detalle, responsable, vence }
    fotos: {}, // codigo -> { blob, ruta, rutaServidor }
    firmas: {}, // rol -> { nombre, blob, ruta, rutaServidor }
  };
  await guardarInspeccion(rec);
  return rec;
}

// Devuelve la copia local; si no existe (ej. otro dispositivo) la baja del servidor.
export async function cargarInspeccion(id) {
  const local = await obtenerInspeccion(id);
  if (local) return local;
  const [d, firmas] = await Promise.all([cargarInspeccionObra(id), listarFirmasObra(id)]);
  const rec = {
    id,
    inspectorId: d.inspectorId,
    enServidor: true,
    estado: d.estado,
    generales: d.generales,
    respuestas: Object.fromEntries(Object.entries(d.respuestas).map(([codigo, valor]) => [codigo, { valor }])),
    hallazgos: d.hallazgos.map((h) => ({ id: h.id, titulo: h.titulo, severidad: h.severidad, detalle: h.detalle, responsable: h.responsable, vence: h.vence })),
    fotos: Object.fromEntries(Object.entries(d.fotos).map(([codigo, ruta]) => [codigo, { ruta, rutaServidor: ruta }])),
    firmas: Object.fromEntries(firmas.map((f) => [f.rol, { nombre: f.nombre, ruta: f.ruta, rutaServidor: f.ruta }])),
  };
  await enSerie(() => guardarInspeccion(rec));
  return rec;
}

export const guardarGenerales = (id, generales) =>
  modificar(id, (rec) => {
    rec.generales = { ...generales };
    return [{ tipo: "generales" }];
  });

export const guardarRespuesta = (id, item, valor) =>
  modificar(id, (rec) => {
    rec.respuestas[item.codigo] = { valor, categoria: item.categoria, texto: item.texto };
    return [{ tipo: "respuesta", clave: item.codigo }];
  });

export const agregarHallazgo = (id, datos) => {
  const hallazgo = { id: crypto.randomUUID(), ...datos, vence: datos.vence || null };
  return modificar(id, (rec) => {
    rec.hallazgos.push(hallazgo);
    return [{ tipo: "hallazgo", clave: hallazgo.id }];
  }).then(() => hallazgo);
};

export const borrarHallazgo = (id, hallazgoId) =>
  modificar(id, async (rec) => {
    rec.hallazgos = rec.hallazgos.filter((h) => h.id !== hallazgoId);
    await borrarOpsDe(rec.id, "hallazgo", hallazgoId); // si nunca se subió, no hay nada que subir
    return [{ tipo: "hallazgoDel", clave: hallazgoId }];
  });

// `blob` ya viene comprimido. Reemplaza la foto anterior del ítem si la había.
export const guardarFoto = (id, codigo, blob) =>
  modificar(id, async (rec) => {
    const previa = rec.fotos[codigo];
    const quitarPendiente = await obtenerOp(`${rec.id}|foto|${codigo}`);
    // Ruta que ya está en el servidor (para borrarla cuando suba la nueva).
    const rutaServidor = previa?.rutaServidor ?? (quitarPendiente?.payload?.accion === "quitar" ? quitarPendiente.payload.ruta : undefined);
    rec.fotos[codigo] = { blob, ruta: `${rec.id}/${codigo}/${Date.now()}.jpg`, rutaServidor };
    return [{ tipo: "foto", clave: codigo, payload: { accion: "subir" } }];
  });

export const quitarFoto = (id, codigo) =>
  modificar(id, async (rec) => {
    const previa = rec.fotos[codigo];
    const pendiente = await obtenerOp(`${rec.id}|foto|${codigo}`);
    const rutaServidor = previa?.rutaServidor ?? (pendiente?.payload?.accion === "quitar" ? pendiente.payload.ruta : undefined);
    delete rec.fotos[codigo];
    if (!rutaServidor) {
      await borrarOpsDe(rec.id, "foto", codigo); // nunca llegó al servidor
      return [];
    }
    return [{ tipo: "foto", clave: codigo, payload: { accion: "quitar", ruta: rutaServidor } }];
  });

export const guardarFirma = (id, rol, nombre, blob) =>
  modificar(id, (rec) => {
    const rutaServidor = rec.firmas[rol]?.rutaServidor;
    rec.firmas[rol] = { nombre, blob, ruta: `${rec.id}/firmas/${rol}-${Date.now()}.png`, rutaServidor };
    return [{ tipo: "firma", clave: rol }];
  });

export const cambiarNombreFirma = (id, rol, nombre) =>
  modificar(id, (rec) => {
    if (!rec.firmas[rol]) return [];
    rec.firmas[rol] = { ...rec.firmas[rol], nombre };
    return [{ tipo: "firma", clave: rol }];
  });

export const marcarEnviada = (id) =>
  modificar(id, (rec) => {
    rec.estado = "enviado";
    return [{ tipo: "enviar" }];
  });
