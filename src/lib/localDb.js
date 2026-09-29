import { openDB } from "idb";

// Base local (IndexedDB). Dos almacenes:
//  - inspecciones: la copia local completa de cada inspección (incluye fotos y firmas como Blob).
//  - cola: envíos pendientes a Supabase. La clave `k` = "<inspección>|<tipo>|<clave>" hace que
//    guardar la misma operación dos veces la reemplace (se conserva solo lo último).
let dbPromise;
export function getDb() {
  dbPromise ??= openDB("cmass", 1, {
    upgrade(db) {
      db.createObjectStore("inspecciones", { keyPath: "id" });
      db.createObjectStore("cola", { keyPath: "k" });
    },
  });
  return dbPromise;
}

// Todas las lecturas-modificaciones-escrituras sobre una inspección pasan por acá,
// para que dos cambios seguidos (ej. dos respuestas rápidas) no se pisen.
let candado = Promise.resolve();
export function enSerie(fn) {
  const corrida = candado.then(fn, fn);
  candado = corrida.catch(() => {});
  return corrida;
}

export async function obtenerInspeccion(id) {
  return (await getDb()).get("inspecciones", id);
}

export async function guardarInspeccion(rec) {
  await (await getDb()).put("inspecciones", { ...rec, actualizadoEn: Date.now() });
}

export async function listarInspeccionesLocales() {
  return (await getDb()).getAll("inspecciones");
}

let contador = 0;
export async function encolar({ inspeccionId, tipo, clave = "-", payload = null }) {
  const op = {
    k: `${inspeccionId}|${tipo}|${clave}`,
    inspeccionId,
    tipo,
    clave,
    payload,
    seq: Date.now() * 1000 + (contador++ % 1000),
    intentos: 0,
    error: null,
  };
  await (await getDb()).put("cola", op);
  return op;
}

export async function obtenerOp(k) {
  return (await getDb()).get("cola", k);
}

export async function borrarOpsDe(inspeccionId, tipo, clave) {
  await (await getDb()).delete("cola", `${inspeccionId}|${tipo}|${clave}`);
}

export async function listarCola() {
  return (await getDb()).getAll("cola");
}

export async function contarCola() {
  return (await getDb()).count("cola");
}

// Borra la operación solo si nadie la reemplazó mientras se enviaba.
export async function borrarOpSiIgual(op) {
  const db = await getDb();
  const tx = db.transaction("cola", "readwrite");
  const actual = await tx.store.get(op.k);
  if (actual && actual.seq === op.seq) await tx.store.delete(op.k);
  await tx.done;
}

export async function marcarErrorOp(op, mensaje) {
  const db = await getDb();
  const tx = db.transaction("cola", "readwrite");
  const actual = await tx.store.get(op.k);
  if (actual && actual.seq === op.seq) await tx.store.put({ ...actual, intentos: actual.intentos + 1, error: mensaje });
  await tx.done;
}
