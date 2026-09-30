import { supabase } from "./supabaseClient.js";
import { faltaColumna } from "./inspeccionesRemoto.js";

const BUCKET = "checklist-fotos";

// Sube la firma (PNG) y deja una sola fila por (inspección, rol). Si ya había
// una firma anterior para ese rol, borra su archivo. Devuelve la ruta nueva.
export async function guardarFirmaObra(t, inspeccionId, rol, nombre, blob, rutaAnterior, ruta, correo = "") {
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: "image/png" });
  if (errSubida && !/already exists|duplicate/i.test(errSubida.message) && String(errSubida.statusCode) !== "409") throw errSubida;

  const fila = { inspeccion_id: inspeccionId, rol, nombre: nombre || null, ruta };
  const guardar = (f) => supabase.from(t.firmas).upsert(f, { onConflict: "inspeccion_id,rol" });
  let { error } = await guardar({ ...fila, correo: correo || null });
  if (faltaColumna(error, "correo")) ({ error } = await guardar(fila)); // SQL de correos sin ejecutar todavía
  if (error) throw error;
  if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
  return ruta;
}

// Cambia solo el nombre del firmante (sin volver a subir la imagen).
export async function guardarNombreFirmaObra(t, inspeccionId, rol, nombre, correo = "") {
  const actualizar = (cambios) => supabase.from(t.firmas).update(cambios).eq("inspeccion_id", inspeccionId).eq("rol", rol);
  let { error } = await actualizar({ nombre: nombre || null, correo: correo || null });
  if (faltaColumna(error, "correo")) ({ error } = await actualizar({ nombre: nombre || null }));
  if (error) throw error;
}

export async function listarFirmasObra(t, inspeccionId) {
  const { data, error } = await supabase
    .from(t.firmas)
    .select("*")
    .eq("inspeccion_id", inspeccionId);
  if (error) throw error;
  return data;
}
