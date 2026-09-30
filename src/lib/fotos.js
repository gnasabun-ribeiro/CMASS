import { supabase } from "./supabaseClient.js";

// Fotos generales de la inspección (Paso 4). Bucket privado `fotos-inspeccion`,
// con una fila por foto en t.fotos. La compresión se hace al sacar la foto, así lo
// que se guarda en el dispositivo (y se sube después) ya es liviano.
export const BUCKET_FOTOS = "fotos-inspeccion";
export const BUCKET_FIRMAS = "checklist-fotos";
export const MAX_FOTOS = 20;

const LADO_MAX = 1600;

// Reduce la foto (las del celular pesan varios MB) y la pasa a JPEG.
export async function comprimirImagen(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return blob;
}

// Repetible: si el archivo o la fila ya estaban de un intento anterior, sigue de largo.
export async function subirFotoGeneral(t, inspeccionId, fotoId, blob, ruta) {
  const { error: errSubida } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, blob, { contentType: "image/jpeg" });
  if (errSubida && !/already exists|duplicate/i.test(errSubida.message) && String(errSubida.statusCode) !== "409") throw errSubida;

  const { error } = await supabase
    .from(t.fotos)
    .upsert({ id: fotoId, inspeccion_id: inspeccionId, ruta }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function quitarFotoGeneral(t, fotoId, ruta) {
  const { error } = await supabase.from(t.fotos).delete().eq("id", fotoId);
  if (error) throw error;
  if (ruta) await supabase.storage.from(BUCKET_FOTOS).remove([ruta]);
}

// Los buckets son privados: para mostrar los archivos hacen falta URLs firmadas (1 h).
export async function urlsFirmadas(rutas, bucket) {
  if (!rutas.length) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(rutas, 3600);
  if (error) throw error;
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

export async function urlADataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
