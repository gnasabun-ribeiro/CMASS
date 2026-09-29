import { supabase } from "./supabaseClient.js";

const BUCKET = "checklist-fotos";

// Sube la firma (PNG) y deja una sola fila por (inspección, rol). Si ya había
// una firma anterior para ese rol, borra su archivo. Devuelve la ruta nueva.
export async function guardarFirmaObra(t, inspeccionId, rol, nombre, blob, rutaAnterior, ruta) {
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: "image/png" });
  if (errSubida && !/already exists|duplicate/i.test(errSubida.message) && String(errSubida.statusCode) !== "409") throw errSubida;

  const { error } = await supabase
    .from(t.firmas)
    .upsert({ inspeccion_id: inspeccionId, rol, nombre: nombre || null, ruta }, { onConflict: "inspeccion_id,rol" });
  if (error) throw error;
  if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
  return ruta;
}

// Cambia solo el nombre del firmante (sin volver a subir la imagen).
export async function guardarNombreFirmaObra(t, inspeccionId, rol, nombre) {
  const { error } = await supabase
    .from(t.firmas)
    .update({ nombre: nombre || null })
    .eq("inspeccion_id", inspeccionId)
    .eq("rol", rol);
  if (error) throw error;
}

export async function listarFirmasObra(t, inspeccionId) {
  const { data, error } = await supabase
    .from(t.firmas)
    .select("rol, nombre, ruta")
    .eq("inspeccion_id", inspeccionId);
  if (error) throw error;
  return data;
}
