export const SEVERIDADES = [
  { value: "Crítico", bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
  { value: "Medio", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  { value: "Bajo", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
];

// Arma el hallazgo tal como lo usan las pantallas (con colores de severidad)
// a partir de los campos crudos (formulario o fila de la base).
export function armarHallazgo({ id, titulo, severidad, detalle, responsable, vence }) {
  const sev = SEVERIDADES.find((s) => s.value === severidad) || SEVERIDADES[1];
  return {
    id,
    titulo,
    severidad: sev.value,
    sevBg: sev.bg,
    sevFg: sev.fg,
    detalle: detalle || "",
    responsable: responsable || "Sin asignar",
    vence: vence || "—",
  };
}
