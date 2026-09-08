export const CHECKLIST_BASE = [
  ["1.1", "El permiso de trabajo está vigente, firmado y en el lugar de la tarea."],
  ["1.2", "El personal usa el EPP requerido y está en buen estado."],
  ["2.1", "Las energías peligrosas están aisladas y bloqueadas (LOTO)."],
  ["2.4", "El área de proyección está delimitada y libre de personal ajeno."],
  ["3.2", "Los equipos tienen la verificación de preuso del día."],
  ["4.1", "Los residuos se segregan en los contenedores correspondientes."],
];

export const OPCIONES = [
  { value: "ok", label: "Cumple", bg: "var(--success-bg)", fg: "var(--success-fg)", border: "var(--success-border)" },
  { value: "no", label: "No cumple", bg: "var(--danger-bg)", fg: "var(--danger-fg)", border: "var(--danger-border)" },
  { value: "na", label: "N/A", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)", border: "var(--border)" },
];
