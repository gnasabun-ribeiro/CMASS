import { supabase } from "./supabaseClient.js";

const BUCKET = "checklist-fotos";
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

// Sube la foto (ya comprimida) a la ruta indicada y guarda esa ruta en la respuesta del ítem.
// Repetible: si el archivo ya estaba subido de un intento anterior, sigue de largo.
// Si había una foto anterior en el servidor, la borra.
export async function subirFotoChecklist(inspeccionId, codigo, blob, rutaAnterior, ruta) {
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: "image/jpeg" });
  if (errSubida && !/already exists|duplicate/i.test(errSubida.message) && String(errSubida.statusCode) !== "409") throw errSubida;

  const { data, error } = await supabase
    .from("inspecciones_obra_checklist")
    .update({ foto_url: ruta })
    .eq("inspeccion_id", inspeccionId)
    .eq("codigo", codigo)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("La respuesta del ítem todavía no está en el servidor");
  if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
  return ruta;
}

export async function quitarFotoChecklist(inspeccionId, codigo, ruta) {
  const { error } = await supabase
    .from("inspecciones_obra_checklist")
    .update({ foto_url: null })
    .eq("inspeccion_id", inspeccionId)
    .eq("codigo", codigo);
  if (error) throw error;
  if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);
}

// El bucket es privado: para mostrar las fotos hacen falta URLs firmadas (1 h).
export async function urlsFirmadas(rutas) {
  if (!rutas.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(rutas, 3600);
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
