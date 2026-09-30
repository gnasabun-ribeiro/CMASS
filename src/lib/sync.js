import { supabase } from "./supabaseClient.js";
import {
  borrarOpSiIgual,
  contarCola,
  enSerie,
  guardarInspeccion,
  listarCola,
  marcarErrorOp,
  obtenerInspeccion,
} from "./localDb.js";
import {
  agregarHallazgo,
  borrarHallazgo,
  crearBorrador,
  guardarGenerales,
  guardarRespuestaChecklist,
  marcarEnviada,
  registrarDestinatarios,
} from "./inspeccionesRemoto.js";
import { tablasDe } from "./tablas.js";
import { quitarFotoGeneral, subirFotoGeneral } from "./fotos.js";
import { guardarFirmaObra, guardarNombreFirmaObra } from "./firmasObra.js";

// Motor de sincronización: vacía la cola local hacia Supabase. Las operaciones
// se ejecutan ordenadas (crear → datos → fotos/firmas → enviar) y son
// repetibles: si se corta la conexión a mitad, se reintenta sin duplicar nada.

const PRIORIDAD = { crear: 0, generales: 1, respuesta: 1, hallazgo: 1, hallazgoDel: 1, foto: 2, firma: 2, enviar: 3 };
const INTERVALO_REINTENTO_MS = 30000;

const estado = {
  pendientes: 0,
  sincronizando: false,
  ultimaSync: null,
  errores: {}, // inspeccionId -> mensaje del último error que no es de conexión
  online: typeof navigator === "undefined" ? true : navigator.onLine,
};
let snapshot = { ...estado };
const suscriptores = new Set();

function emitir() {
  snapshot = { ...estado, errores: { ...estado.errores } };
  suscriptores.forEach((fn) => fn());
}

export const suscribir = (fn) => {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
};
export const obtenerEstado = () => snapshot;

export async function refrescarEstado() {
  estado.pendientes = await contarCola();
  emitir();
}

function esErrorDeRed(err) {
  const msg = String(err?.message ?? err);
  return !navigator.onLine || /failed to fetch|network|load failed|fetch failed|timeout/i.test(msg);
}

let temporizador;
export function agendarSync() {
  refrescarEstado();
  clearTimeout(temporizador);
  temporizador = setTimeout(sincronizar, 1000);
}

// Actualiza la copia local después de un envío exitoso, solo si el dato no cambió mientras tanto.
function actualizarLocal(id, fn) {
  return enSerie(async () => {
    const rec = await obtenerInspeccion(id);
    if (!rec) return;
    fn(rec);
    await guardarInspeccion(rec);
  });
}

async function ejecutar(op, rec) {
  const id = rec.id;
  const t = tablasDe(rec.moduloId); // las copias viejas no traen moduloId: eran de obra
  switch (op.tipo) {
    case "crear":
      await crearBorrador(t, { id, inspectorId: rec.inspectorId, moduloId: rec.moduloId, subId: rec.subId });
      await actualizarLocal(id, (r) => {
        r.enServidor = true;
      });
      return;
    case "generales":
      return guardarGenerales(t, id, rec.generales);
    case "respuesta": {
      const r = rec.respuestas[op.clave];
      if (!r) return;
      return guardarRespuestaChecklist(t, id, { codigo: op.clave, categoria: r.categoria, texto: r.texto }, r.valor);
    }
    case "hallazgo": {
      const h = rec.hallazgos.find((x) => x.id === op.clave);
      if (!h) return;
      return agregarHallazgo(t, id, h);
    }
    case "hallazgoDel":
      return borrarHallazgo(t, op.clave);
    case "foto": {
      if (op.payload.accion === "quitar") return quitarFotoGeneral(t, op.clave, op.payload.ruta);
      const f = (rec.galeria ?? []).find((x) => x.id === op.clave);
      if (!f?.blob) return;
      await subirFotoGeneral(t, id, f.id, f.blob, f.ruta);
      let huerfana = false;
      await actualizarLocal(id, (r) => {
        const x = (r.galeria ?? []).find((y) => y.id === f.id);
        if (x) x.subida = true;
        else huerfana = true; // se quitó mientras se subía: se borra del servidor también
      });
      if (huerfana) await quitarFotoGeneral(t, f.id, f.ruta);
      return;
    }
    case "firma": {
      const f = rec.firmas[op.clave];
      if (!f) return;
      if (f.blob && f.ruta !== f.rutaServidor) {
        await guardarFirmaObra(t, id, op.clave, f.nombre, f.blob, f.rutaServidor, f.ruta, f.correo);
        await actualizarLocal(id, (r) => {
          if (r.firmas[op.clave]?.ruta === f.ruta) r.firmas[op.clave].rutaServidor = f.ruta;
        });
      } else {
        await guardarNombreFirmaObra(t, id, op.clave, f.nombre, f.correo);
      }
      return;
    }
    case "enviar":
      await marcarEnviada(t, id);
      return registrarDestinatarios(t, rec); // `enviar` va al final (prioridad 3): hallazgos y firmas ya están arriba
    default:
      throw new Error(`Operación desconocida: ${op.tipo}`);
  }
}

let corriendo = false;
export async function sincronizar() {
  if (corriendo || !supabase) return;
  corriendo = true;
  estado.sincronizando = true;
  emitir();
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;

    const ops = (await listarCola()).sort((a, b) => (PRIORIDAD[a.tipo] ?? 9) - (PRIORIDAD[b.tipo] ?? 9) || a.seq - b.seq);
    const fallidas = new Set(); // si una operación falla, se saltea el resto de esa inspección

    for (const op of ops) {
      if (fallidas.has(op.inspeccionId)) continue;
      const rec = await obtenerInspeccion(op.inspeccionId);
      if (!rec) {
        await borrarOpSiIgual(op);
        continue;
      }
      if (rec.inspectorId !== uid) continue; // pertenece a otro usuario de este dispositivo
      try {
        await ejecutar(op, rec);
        await borrarOpSiIgual(op);
        delete estado.errores[op.inspeccionId];
        estado.ultimaSync = new Date();
      } catch (err) {
        if (esErrorDeRed(err)) break; // sin conexión: se reintenta más tarde, no es un error
        fallidas.add(op.inspeccionId);
        const mensaje = err?.message || String(err);
        estado.errores[op.inspeccionId] = mensaje;
        await marcarErrorOp(op, mensaje);
      }
      await refrescarEstado();
    }
  } finally {
    corriendo = false;
    estado.sincronizando = false;
    await refrescarEstado();
  }
}

let iniciado = false;
export function iniciarSync() {
  if (iniciado || !supabase) return;
  iniciado = true;
  window.addEventListener("online", () => {
    estado.online = true;
    emitir();
    sincronizar();
  });
  window.addEventListener("offline", () => {
    estado.online = false;
    emitir();
  });
  supabase.auth.onAuthStateChange((_evento, sesion) => {
    if (sesion) agendarSync();
  });
  setInterval(() => {
    if (estado.pendientes > 0) sincronizar();
  }, INTERVALO_REINTENTO_MS);
  refrescarEstado().then(() => estado.pendientes > 0 && sincronizar());
}
