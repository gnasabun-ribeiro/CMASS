import { ICONS } from "../data/icons.js";

// Trazo de 1.75 px en pantalla para cualquier tamaño (los íconos se dibujan en 24×24 y se
// escalan): así un ícono de 16 y uno de 32 tienen el mismo grosor. Tamaños de la escala:
// 16 (dentro de texto/botones chicos), 20 (botones, navegación), 24 (destacados).
const TRAZO_PX = 1.75;

export default function Icon({ name, size = 20, strokeWidth, color = "currentColor", style }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth ?? (TRAZO_PX * 24) / (typeof size === "number" ? size : 24)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "0 0 auto", display: "block", ...style }}
    >
      <path d={d} />
    </svg>
  );
}
