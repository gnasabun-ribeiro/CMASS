export const ESTADOS = ["Todos", "En proceso", "Cerrada", "Vencida", "Borrador"];

export const ESTADO_COLORS = {
  Cerrada: { bg: "var(--success-bg)", fg: "var(--success-fg)" },
  "En proceso": { bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  Borrador: { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
  Vencida: { bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
};

export const REGISTROS = [
  {
    dia: "08",
    mes: "SEP",
    titulo: "Inspección de Obra — RN-40 km 212",
    detalle: "Vialidad Provincial · J. Alcaraz",
    hallazgos: 3,
    estado: "En proceso",
  },
  {
    dia: "07",
    mes: "SEP",
    titulo: "Tarjeta TOP — Batería 12",
    detalle: "YPF Yacimiento Sur · M. Giménez",
    hallazgos: 0,
    estado: "Cerrada",
  },
  {
    dia: "05",
    mes: "SEP",
    titulo: "Permiso de trabajo en caliente",
    detalle: "Planta Norte · L. Ferreyra",
    hallazgos: 1,
    estado: "Cerrada",
  },
  {
    dia: "04",
    mes: "SEP",
    titulo: "Chequeo de gestión ambiental",
    detalle: "Planta Norte · S. Duarte",
    hallazgos: 5,
    estado: "Vencida",
  },
  {
    dia: "03",
    mes: "SEP",
    titulo: "Inspección de servicios — Taller",
    detalle: "Ribeiro Servicios · C. Ortiz",
    hallazgos: 2,
    estado: "En proceso",
  },
  {
    dia: "02",
    mes: "SEP",
    titulo: "Visita gerencial — Yacimiento Sur",
    detalle: "Dirección · R. Bustos",
    hallazgos: 0,
    estado: "Borrador",
  },
];

export function hallazgosColor(n) {
  if (n > 2) return "var(--danger-fg)";
  if (n > 0) return "var(--warn-fg)";
  return "var(--success-fg)";
}

export const GRUPOS_PENDIENTES = [
  {
    titulo: "Auditorías",
    items: [
      { label: "Obras", meta: "2 formularios · 6 fotos", count: 2, pending: true },
      { label: "Servicios", meta: "1 formulario", count: 1, pending: true },
      { label: "Contratistas", meta: "sin pendientes", count: 0, pending: false },
    ],
  },
  {
    titulo: "Reglas de Oro",
    items: [
      { label: "Permisos de trabajo", meta: "2 formularios", count: 2, pending: true },
      { label: "Aislamiento de energías", meta: "1 formulario", count: 1, pending: true },
      { label: "Excavaciones", meta: "sin pendientes", count: 0, pending: false },
    ],
  },
  {
    titulo: "Observación de conducta",
    items: [
      { label: "Tarjetas TOP", meta: "1 formulario · 2 fotos", count: 1, pending: true },
      { label: "Visitas gerenciales", meta: "sin pendientes", count: 0, pending: false },
    ],
  },
];

export const PENDIENTES_TOTAL = 7;
