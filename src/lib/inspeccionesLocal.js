import { borrarOpsDe, encolar, enSerie, guardarInspeccion, listarCola, obtenerInspeccion } from "./localDb.js";
import { agendarSync } from "./sync.js";
import { cargarInspeccionRemota } from "./inspeccionesRemoto.js";
import { tablasDe } from "./tablas.js";
import { listarFirmasObra } from "./firmasObra.js";
import { uuid } from "./uuid.js";

// API que usa el formulario: todo se escribe primero en el dispositivo y se
// encola para subirlo a Supabase apenas haya conexión (ver sync.js). Las funciones
// que modifican reciben `autor` (el usuario logueado): lo sube esa persona, que no
// siempre es el dueño (el administrador corrige inspecciones ajenas).

const GENERALES_VACIOS = { cliente: "", ubicacion: "", grupoAuditado: "", fechaHora: "", tareaObservada: "" };

// Guarda la copia local y encola las operaciones. Si la inspección todavía no
// existe en el servidor, antepone "crear" (solo se sube cuando hay algo que subir) y
// sube también Generales, que pueden venir completados desde que se creó (en la TOP,
// el nombre de quien la completa).
async function confirmar(rec, autor, ops) {
  await guardarInspeccion(rec);
  if (ops.length && !rec.enServidor) {
    await encolar({ inspeccionId: rec.id, tipo: "crear", autor });
    await encolar({ inspeccionId: rec.id, tipo: "generales", autor });
  }
  for (const op of ops) await encolar({ inspeccionId: rec.id, autor, ...op });
  agendarSync();
}

// Aplica un cambio a la copia local de forma serializada.
function modificar(id, autor, fn) {
  return enSerie(async () => {
    const rec = await obtenerInspeccion(id);
    if (!rec) throw new Error("La inspección no existe en este dispositivo");
    const ops = await fn(rec);
    await confirmar(rec, autor, ops || []);
    return rec;
  });
}

// `generales`: valores con los que arranca (ej. los `datos` propios de la TOP).
export async function nuevaInspeccion(inspectorId, moduloId, subId = null, generales = {}) {
  const rec = {
    id: uuid(),
    inspectorId,
    moduloId,
    subId,
    enServidor: false,
    estado: "borrador",
    generales: { ...GENERALES_VACIOS, ...generales },
    respuestas: {}, // codigo -> { valor, categoria, texto }
    hallazgos: [], // { id, titulo, severidad, detalle, responsable, correo, vence }
    galeria: [], // fotos generales: { id, blob?, ruta, subida }
    firmas: {}, // rol -> { nombre, blob, ruta, rutaServidor }
  };
  await guardarInspeccion(rec);
  return rec;
}

// Devuelve la inspección para el formulario. La copia del dispositivo vale si tiene cambios
// sin enviar, si nunca llegó al servidor o si no hay conexión; si no, se vuelve a bajar (otro
// dispositivo o el administrador pueden haberla cambiado). Si la bajada falla, queda la local.
export async function cargarInspeccion(id, moduloId) {
  const local = await obtenerInspeccion(id);
  if (local) {
    if (!navigator.onLine || !local.enServidor) return local;
    const conCambios = (await listarCola()).some((op) => op.inspeccionId === id);
    if (conCambios) return local;
  }
  try {
    return await bajarInspeccion(id, moduloId);
  } catch (err) {
    if (local) return local;
    throw err;
  }
}

async function bajarInspeccion(id, moduloId) {
  const t = tablasDe(moduloId);
  const [d, firmas] = await Promise.all([cargarInspeccionRemota(t, id), listarFirmasObra(t, id)]);
  const rec = {
    id,
    inspectorId: d.inspectorId,
    moduloId: d.moduloId,
    subId: d.subId,
    enServidor: true,
    estado: d.estado,
    generales: d.generales,
    respuestas: Object.fromEntries(Object.entries(d.respuestas).map(([codigo, valor]) => [codigo, { valor, comentario: d.comentarios?.[codigo] || "" }])),
    hallazgos: d.hallazgos.map((h) => ({ id: h.id, titulo: h.titulo, severidad: h.severidad, detalle: h.detalle, responsable: h.responsable, correo: h.responsable_correo || "", vence: h.vence })),
    galeria: d.galeria.map((f) => ({ id: f.id, ruta: f.ruta, subida: true })),
    firmas: Object.fromEntries(firmas.map((f) => [f.rol, { nombre: f.nombre, correo: f.correo || "", ruta: f.ruta, rutaServidor: f.ruta }])),
  };
  await enSerie(() => guardarInspeccion(rec));
  return rec;
}

export const guardarGenerales = (id, autor, generales) =>
  modificar(id, autor, (rec) => {
    rec.generales = { ...generales };
    return [{ tipo: "generales" }];
  });

// El comentario lo decide el formulario: el detalle de "Cumple parcialmente" o lo escrito en
// un "Otros" de la TOP; con cualquier otra respuesta llega vacío.
export const guardarRespuesta = (id, autor, item, valor, comentario = "") =>
  modificar(id, autor, (rec) => {
    rec.respuestas[item.codigo] = {
      valor,
      categoria: item.categoria,
      texto: item.texto,
      comentario,
    };
    return [{ tipo: "respuesta", clave: item.codigo }];
  });

export const agregarHallazgo = (id, autor, datos) => {
  const hallazgo = { id: uuid(), ...datos, vence: datos.vence || null };
  return modificar(id, autor, (rec) => {
    rec.hallazgos.push(hallazgo);
    return [{ tipo: "hallazgo", clave: hallazgo.id }];
  }).then(() => hallazgo);
};

export const borrarHallazgo = (id, autor, hallazgoId) =>
  modificar(id, autor, async (rec) => {
    rec.hallazgos = rec.hallazgos.filter((h) => h.id !== hallazgoId);
    await borrarOpsDe(rec.id, "hallazgo", hallazgoId); // si nunca se subió, no hay nada que subir
    return [{ tipo: "hallazgoDel", clave: hallazgoId }];
  });

// `blob` ya viene comprimido. Devuelve la foto agregada (con su id).
export const agregarFoto = async (id, autor, blob) => {
  let foto;
  await modificar(id, autor, (rec) => {
    rec.galeria ??= [];
    const fotoId = uuid();
    foto = { id: fotoId, blob, ruta: `${rec.id}/${fotoId}.jpg`, subida: false };
    rec.galeria.push(foto);
    return [{ tipo: "foto", clave: fotoId, payload: { accion: "subir" } }];
  });
  return foto;
};

export const quitarFoto = (id, autor, fotoId) =>
  modificar(id, autor, async (rec) => {
    const foto = (rec.galeria ?? []).find((f) => f.id === fotoId);
    rec.galeria = (rec.galeria ?? []).filter((f) => f.id !== fotoId);
    if (!foto?.subida) {
      await borrarOpsDe(rec.id, "foto", fotoId); // nunca llegó al servidor
      return [];
    }
    return [{ tipo: "foto", clave: fotoId, payload: { accion: "quitar", ruta: foto.ruta } }];
  });

export const guardarFirma = (id, autor, rol, nombre, blob, correo = "") =>
  modificar(id, autor, (rec) => {
    const rutaServidor = rec.firmas[rol]?.rutaServidor;
    rec.firmas[rol] = { nombre, correo, blob, ruta: `${rec.id}/firmas/${rol}-${Date.now()}.png`, rutaServidor };
    return [{ tipo: "firma", clave: rol }];
  });

export const cambiarNombreFirma = (id, autor, rol, nombre, correo = "") =>
  modificar(id, autor, (rec) => {
    if (!rec.firmas[rol]) return [];
    rec.firmas[rol] = { ...rec.firmas[rol], nombre, correo };
    return [{ tipo: "firma", clave: rol }];
  });

export const marcarEnviada = (id, autor) =>
  modificar(id, autor, (rec) => {
    rec.estado = "enviado";
    return [{ tipo: "enviar" }];
  });
