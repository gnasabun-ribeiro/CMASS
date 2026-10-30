import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MARCAS_TOP, OPCIONES, agruparPorCategoria, marcaTop } from "../data/checklist.js";
import { hoyLocal } from "./fechas.js";
import { urlADataUrl } from "./fotos.js";
import logoRibeiro from "../assets/logo-ribeiro.png";

const ETIQUETA_RESPUESTA = Object.fromEntries(OPCIONES.map((o) => [o.value, o.label]));

// Colores fijos (no dependen del tema) — mismos valores que --success-fg/--danger-fg/--neutral-fg en index.css.
const COLOR_RESPUESTA = {
  ok: [21, 128, 61],
  no: [190, 24, 93],
  na: [78, 71, 98],
  parcial: [138, 61, 8],
};
const COLOR_SIN_RESPONDER = [140, 140, 150];

const COLOR_SEVERIDAD = {
  "Crítico": [190, 24, 93],
  Medio: [138, 61, 8],
  Bajo: [78, 71, 98],
};

const CAMPOS_GENERALES = [
  ["Cliente", "cliente"],
  ["Ubicación / Zona", "ubicacion"],
  ["Grupo auditado", "grupoAuditado"],
  ["Fecha y hora", "fechaHora"],
  ["Tarea observada", "tareaObservada"],
];

// Las fuentes del PDF (WinAnsi) traen Latin-1 y unos pocos signos más. Si un texto tiene
// cualquier otro carácter (un emoji, ≤, →), jsPDF lo escribe entero en otra codificación y
// sale ilegible: se reemplazan los signos comunes y se descarta el resto.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const REEMPLAZOS_PDF = { "≤": "<=", "≥": ">=", "≠": "!=", "→": "->", "←": "<-", "✓": "OK", "✔": "OK" };

export function textoPdf(valor) {
  if (typeof valor !== "string") return valor;
  return Array.from(valor.normalize("NFC"), (c) => REEMPLAZOS_PDF[c] ?? (c <= "\u00ff" || WIN_ANSI_EXTRA.includes(c) ? c : ""))
    .join("")
    .replace(/ {2,}/g, " ");
}

function formatearFechaHora(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function agregarEncabezado(doc, titulo) {
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Informe de inspección", 40, 46);
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.setTextColor(90, 90, 100);
  doc.text(textoPdf(titulo), 40, 64);
  doc.text(textoPdf(`Generado el ${new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`), 40, 80);
  doc.setTextColor(20, 20, 20);
}

function agregarGenerales(doc, generales, y) {
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Generales", 40, y);
  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 130 } },
    body: CAMPOS_GENERALES.map(([label, campo]) => [
      label,
      textoPdf(campo === "fechaHora" ? formatearFechaHora(generales[campo]) : generales[campo] || "—"),
    ]),
  });
  return doc.lastAutoTable.finalY + 20;
}

function agregarResumen(doc, resumen, y) {
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Resumen", 40, y);
  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 } },
    body: resumen.filter((r) => !r.soloPantalla).map((r) => [textoPdf(r.label), textoPdf(r.value)]),
  });
  return doc.lastAutoTable.finalY + 20;
}

function agregarChecklist(doc, checklist, respuestas, comentarios, y) {
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Checklist", 40, y);
  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    head: [["Código", "Categoría", "Ítem", "Respuesta"]],
    body: checklist.map((item) => {
      const valor = respuestas[item.codigo];
      const detalle = valor === "parcial" && comentarios[item.codigo] ? `
Detalle: ${comentarios[item.codigo]}` : "";
      return [item.codigo, textoPdf(item.categoria), textoPdf(item.texto + detalle), valor ? ETIQUETA_RESPUESTA[valor] : "Sin responder"];
    }),
    styles: { fontSize: 9, cellPadding: 5, valign: "top" },
    headStyles: { fillColor: [78, 47, 130], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 95 },
      3: { cellWidth: 70 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 3) {
        const item = checklist[data.row.index];
        const valor = respuestas[item.codigo];
        data.cell.styles.textColor = valor ? COLOR_RESPUESTA[valor] : COLOR_SIN_RESPONDER;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  return doc.lastAutoTable.finalY + 20;
}

function agregarHallazgos(doc, hallazgos, y) {
  if (!hallazgos.length) return y;
  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`Hallazgos (${hallazgos.length})`, 40, y);
  autoTable(doc, {
    startY: y + 8,
    margin: { left: 40, right: 40 },
    head: [["Título", "Severidad", "Detalle", "Responsable", "Vence"]],
    body: hallazgos.map((h) => [textoPdf(h.titulo), h.severidad, textoPdf(h.detalle || "—"), textoPdf(h.responsable), h.vence]),
    styles: { fontSize: 9, cellPadding: 5, valign: "top" },
    headStyles: { fillColor: [78, 47, 130], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 55 },
      3: { cellWidth: 75 },
      4: { cellWidth: 55 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const h = hallazgos[data.row.index];
        data.cell.styles.textColor = COLOR_SEVERIDAD[h.severidad] || COLOR_SIN_RESPONDER;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  return doc.lastAutoTable.finalY + 20;
}

// fotos: lista de dataUrl (JPEG) — grilla de 2 columnas.
function agregarFotos(doc, fotos, y) {
  if (!fotos.length) return y;
  const pagina = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
  const anchoCelda = (pagina.w - 80 - 16) / 2;
  const altoImg = 170;
  const altoCelda = altoImg + 24;

  if (y > pagina.h - 100 - altoCelda) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`Fotos de la inspección (${fotos.length})`, 40, y);
  y += 14;

  fotos.forEach((dataUrl, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) y += altoCelda;
    if (col === 0 && y + altoCelda > pagina.h - 40) {
      doc.addPage();
      y = 40;
    }
    const x = 40 + col * (anchoCelda + 16);
    const props = doc.getImageProperties(dataUrl);
    const escala = Math.min(anchoCelda / props.width, altoImg / props.height);
    doc.addImage(dataUrl, "JPEG", x, y, props.width * escala, props.height * escala);
    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(60, 60, 70);
    doc.text(`Foto ${i + 1}`, x, y + altoImg + 12);
    doc.setTextColor(20, 20, 20);
  });
  return y + altoCelda + 10;
}

// firmas: { inspector: { nombre, dataUrl }, responsable: { nombre, dataUrl } }
function agregarFirmas(doc, firmas, y) {
  const roles = [
    ["inspector", "Inspector CMASS"],
  ];
  const pagina = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
  const ancho = (pagina.w - 80 - 30) / 2;
  const altoImg = 70;
  if (y + altoImg + 70 > pagina.h - 40) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Firmas", 40, y);
  y += 16;
  roles.forEach(([rol, etiqueta], i) => {
    const x = 40 + i * (ancho + 30);
    const f = firmas[rol];
    if (f?.dataUrl) {
      const props = doc.getImageProperties(f.dataUrl);
      const escala = Math.min(ancho / props.width, altoImg / props.height);
      doc.addImage(f.dataUrl, "PNG", x, y, props.width * escala, props.height * escala);
    }
    doc.setDrawColor(120, 120, 130);
    doc.line(x, y + altoImg + 4, x + ancho, y + altoImg + 4);
    doc.setFontSize(9.5);
    doc.setFont(undefined, "bold");
    doc.text(textoPdf(f?.nombre || "—"), x, y + altoImg + 18);
    doc.setFont(undefined, "normal");
    doc.setTextColor(90, 90, 100);
    doc.text(etiqueta, x, y + altoImg + 31);
    doc.setTextColor(20, 20, 20);
  });
  return y + altoImg + 45;
}

export function construirInformePDF({ titulo, generales, resumen, checklist, respuestas, comentarios = {}, hallazgos, fotos = [], firmas = {} }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  agregarEncabezado(doc, titulo);
  let y = 110;
  y = agregarGenerales(doc, generales, y);
  y = agregarResumen(doc, resumen, y);
  y = agregarChecklist(doc, checklist, respuestas, comentarios, y);
  y = agregarHallazgos(doc, hallazgos, y);
  y = agregarFotos(doc, fotos, y);
  agregarFirmas(doc, firmas, y);

  return doc;
}

// --- Tarjeta TOP: mismo formato que la tarjeta impresa (RG 28-01) -------------------------

const TINTA = [27, 27, 27];
const AMARILLO = [255, 229, 0];
const BANDA = { fillColor: AMARILLO, fontStyle: "bold", halign: "center", fontSize: 10 };

function encabezadoTarjeta(doc, logo, y) {
  const ancho = doc.internal.pageSize.getWidth() - 80;
  const [x1, x2] = [104, 40 + ancho - 110]; // columnas: logo | título | código
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(1.2);
  doc.rect(40, y, ancho, 56);
  doc.line(x1, y, x1, y + 56);
  doc.line(x2, y, x2, y + 56);
  doc.setLineWidth(0.6);
  doc.line(x2, y + 28, 40 + ancho, y + 28);
  if (logo) doc.addImage(logo, "PNG", 50, y + 6, 44, 44);
  doc.setTextColor(...TINTA);
  doc.setFont(undefined, "bold");
  doc.setFontSize(15);
  doc.text(["TARJETA DE OBSERVACIÓN", "PREVENTIVA"], (x1 + x2) / 2, y + 24, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(7.5);
  doc.text(["Descripción:", "Emisión APROBADO"], x2 + 6, y + 11);
  doc.text(["RG 28-01", "Rev: 0"], x2 + 6, y + 39);
  return y + 56;
}

const estiloTarjeta = {
  theme: "grid",
  margin: { left: 40, right: 40 },
  styles: { fontSize: 9, cellPadding: 4, lineColor: TINTA, lineWidth: 0.6, textColor: TINTA, valign: "middle" },
};

// Frente: "Tipo de observación", con una X en SI / NO / N/A (verde si es seguro, roja si es desvío).
function frenteTarjeta(doc, checklist, respuestas, comentarios, y) {
  const filas = [[{ content: "TIPO DE OBSERVACIÓN", colSpan: 4, styles: BANDA }]];
  const items = [null]; // ítem de cada fila (null = banda o título de categoría)
  agruparPorCategoria(checklist).forEach((b, i) => {
    filas.push([{ content: textoPdf(`${i + 1}) ${b.categoria}`), styles: { fontStyle: "bold" } }, ...MARCAS_TOP.map((m) => ({ content: m.label, styles: { fontStyle: "bold", fontSize: 8 } }))]);
    items.push(null);
    for (const item of b.items) {
      const marca = marcaTop(item, respuestas[item.codigo]);
      const texto = item.otros ? `Otros: ${comentarios[item.codigo]?.trim() || ""}` : item.texto;
      filas.push([textoPdf(texto), ...MARCAS_TOP.map((m) => (m.value === marca ? "X" : ""))]);
      items.push(item);
    }
  });
  autoTable(doc, {
    ...estiloTarjeta,
    // Filas más bajas para que el frente entre en una hoja, como la tarjeta.
    margin: { left: 40, right: 40, top: 40, bottom: 30 },
    styles: { ...estiloTarjeta.styles, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    startY: y,
    body: filas,
    columnStyles: { 1: { cellWidth: 34, halign: "center" }, 2: { cellWidth: 34, halign: "center" }, 3: { cellWidth: 34, halign: "center" } },
    didParseCell(data) {
      const item = items[data.row.index];
      if (data.section !== "body" || !item || data.column.index === 0 || data.cell.raw !== "X") return;
      data.cell.styles.textColor = COLOR_RESPUESTA[respuestas[item.codigo]];
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fontSize = 10;
    },
  });
  return doc.lastAutoTable.finalY;
}

// Dorso: datos de quien la completa, detalle y acciones, y la frase del pie.
function dorsoTarjeta(doc, generales, y) {
  const datos = generales.datos || {};
  const dato = (etiqueta, valor) => [{ content: etiqueta, styles: { fontStyle: "bold" } }, textoPdf(valor?.trim() || "")];
  const texto = (titulo, valor) => [
    [{ content: titulo, colSpan: 2, styles: BANDA }],
    [{ content: textoPdf(valor?.trim() || ""), colSpan: 2, styles: { minCellHeight: 90, valign: "top", fontSize: 10 } }],
  ];
  autoTable(doc, {
    ...estiloTarjeta,
    startY: y,
    columnStyles: { 0: { cellWidth: 150 } },
    body: [
      [{ content: "DATOS DE QUIEN COMPLETA LA TOP", colSpan: 2, styles: BANDA }],
      dato("APELLIDO Y NOMBRE:", datos.observador),
      dato("FUNCIÓN:", datos.funcion),
      dato("ÁREA DE TRABAJO:", generales.ubicacion),
      dato("FECHA DE OBSERVACIÓN:", generales.fechaHora ? formatearFechaHora(generales.fechaHora) : ""),
      dato("CLIENTE / OBRA:", generales.cliente),
      ...texto("DETALLE OBSERVACIÓN", generales.tareaObservada),
      ...texto("ACCIÓN INMEDIATA", datos.accionInmediata),
      ...texto("ACCIÓN PARA EVITAR LA REITERACIÓN", datos.accionReiteracion),
      [{ content: "LA PREVENCIÓN QUE HAGAMOS HOY, MARCARÁ EL CAMINO DEL MAÑANA", colSpan: 2, styles: { ...BANDA, fontSize: 9 } }],
    ],
  });
  return doc.lastAutoTable.finalY;
}

// `logo`: dataUrl PNG (sin conexión puede faltar: sale sin logo). Sin fotos: la tarjeta no las tiene.
export function construirTarjetaTopPDF({ generales, checklist, respuestas, comentarios = {}, firmas = {}, logo }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  frenteTarjeta(doc, checklist, respuestas, comentarios, encabezadoTarjeta(doc, logo, 40));
  doc.addPage();
  const y = dorsoTarjeta(doc, generales, encabezadoTarjeta(doc, logo, 40)) + 24;
  agregarFirmas(doc, firmas, y);
  return doc;
}

export async function generarInformePDF(datos) {
  if (datos.formato === "top") {
    const logo = await urlADataUrl(logoRibeiro).catch(() => null);
    construirTarjetaTopPDF({ ...datos, logo }).save(`tarjeta-top-${hoyLocal()}.pdf`);
    return;
  }
  const doc = construirInformePDF(datos);
  const nombreArchivo = `informe-inspeccion-${hoyLocal()}.pdf`;
  doc.save(nombreArchivo);
}
