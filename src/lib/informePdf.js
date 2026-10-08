import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { OPCIONES } from "../data/checklist.js";

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
  doc.text(titulo, 40, 64);
  doc.text(`Generado el ${new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`, 40, 80);
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
      campo === "fechaHora" ? formatearFechaHora(generales[campo]) : generales[campo] || "—",
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
    body: resumen.map((r) => [r.label, r.value]),
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
      return [item.codigo, item.categoria, item.texto + detalle, valor ? ETIQUETA_RESPUESTA[valor] : "Sin responder"];
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
    body: hallazgos.map((h) => [h.titulo, h.severidad, h.detalle || "—", h.responsable, h.vence]),
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
    doc.text(f?.nombre || "—", x, y + altoImg + 18);
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

export function generarInformePDF(datos) {
  const doc = construirInformePDF(datos);
  const nombreArchivo = `informe-inspeccion-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
