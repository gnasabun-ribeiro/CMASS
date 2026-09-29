export const ESTADOS = ["Todos", "Borrador", "Enviado"];

export const ESTADO_COLORS = {
  Enviado: { bg: "var(--success-bg)", fg: "var(--success-fg)" },
  Borrador: { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
};

export function hallazgosColor(n) {
  if (n > 2) return "var(--danger-fg)";
  if (n > 0) return "var(--warn-fg)";
  return "var(--success-fg)";
}
