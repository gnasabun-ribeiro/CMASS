import { getChecklist } from "../data/checklist.js";
import { armarHallazgo } from "../data/severidades.js";
import { BUCKET_FIRMAS, BUCKET_FOTOS, urlADataUrl, urlsFirmadas } from "./fotos.js";

// Datos de una inspección guardada (la copia de inspeccionesLocal.cargarInspeccion) tal como los
// usan el panel de detalle de Registros y el PDF. Es el mismo cálculo que hace el formulario
// (Formulario/index.jsx: `resumen`; PasoCierre: descargarPDF): si se cambia uno, cambiar el otro.

export function datosDeInspeccion(rec) {
  const moduloId = rec.moduloId ?? "obra"; // las copias viejas no traen módulo: eran de obra
  const checklist = getChecklist(moduloId, rec.subId);
  const respuestas = Object.fromEntries(Object.entries(rec.respuestas).map(([codigo, r]) => [codigo, r.valor]));
  const comentarios = Object.fromEntries(Object.entries(rec.respuestas).filter(([, r]) => r.comentario).map(([codigo, r]) => [codigo, r.comentario]));
  const valores = Object.values(respuestas);
  const contar = (v) => valores.filter((x) => x === v).length;
  const contestadas = checklist.filter((i) => respuestas[i.codigo] != null).length;
  // Los "Otros" de la TOP son optativos: cuentan solo si se marcaron.
  const totalItems = checklist.filter((i) => !i.otros || respuestas[i.codigo] != null).length;
  const hallazgos = rec.hallazgos.map(armarHallazgo);
  const esTop = moduloId === "top";
  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${totalItems}` },
    ...(esTop
      ? []
      : [
          { label: "Cumple parcialmente", value: String(contar("parcial")) },
          { label: "No cumple", value: String(contar("no")) },
          { label: "Hallazgos cargados", value: String(hallazgos.length) },
          { label: "Fotos adjuntas", value: String((rec.galeria ?? []).length) },
        ]),
  ];
  return {
    moduloId,
    esTop,
    checklist,
    respuestas,
    comentarios,
    hallazgos,
    resumen,
    conteo: { ok: contar("ok"), parcial: contar("parcial"), no: contar("no"), na: contar("na"), sinResponder: totalItems - contestadas, total: totalItems },
  };
}

const blobADataUrl = (blob) =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });

// Las fotos y firmas: del dispositivo (Blob) o del servidor (URL firmada, requiere conexión).
async function imagenes(items, bucket) {
  const remotas = items.filter((x) => !x.blob && x.ruta);
  const urls = remotas.length && navigator.onLine ? await urlsFirmadas(remotas.map((x) => x.ruta), bucket).catch(() => ({})) : {};
  return Promise.all(
    items.map(async (x) => {
      try {
        if (x.blob) return await blobADataUrl(x.blob);
        if (urls[x.ruta]) return await urlADataUrl(urls[x.ruta]);
      } catch {
        /* una imagen que no se pudo leer no frena el informe */
      }
      return null;
    })
  );
}

export async function descargarInformeDe(rec, titulo) {
  const d = datosDeInspeccion(rec);
  const galeria = rec.galeria ?? [];
  const firmas = Object.entries(rec.firmas);
  const [fotos, imagenesFirma] = await Promise.all([d.esTop ? [] : imagenes(galeria, BUCKET_FOTOS), imagenes(firmas.map(([, f]) => f), BUCKET_FIRMAS)]);
  const firmasPdf = Object.fromEntries(firmas.map(([rol, f], i) => [rol, { nombre: f.nombre, dataUrl: imagenesFirma[i] }]));
  const { generarInformePDF } = await import("./informePdf.js");
  await generarInformePDF({
    formato: d.esTop ? "top" : undefined,
    titulo,
    generales: rec.generales,
    resumen: d.resumen,
    checklist: d.checklist,
    respuestas: d.respuestas,
    comentarios: d.comentarios,
    hallazgos: d.hallazgos,
    fotos: fotos.filter(Boolean),
    firmas: firmasPdf,
  });
}
