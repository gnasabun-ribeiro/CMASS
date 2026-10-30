import { useEffect, useState } from "react";

// Mismos cortes que src/styles/tokens.css (las media queries de CSS no aceptan variables).
// Mobile-first: cada nombre vale "desde ese ancho".
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

// Hasta `sm` (sin incluirlo) es pantalla de celular.
export const CONSULTA_CELULAR = `(max-width: ${BREAKPOINTS.sm - 0.02}px)`;

// true mientras se cumpla la media query; se actualiza al girar o cambiar el tamaño.
export function useMediaQuery(consulta) {
  const [cumple, setCumple] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambiar = () => setCumple(mq.matches);
    cambiar();
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, [consulta]);

  return cumple;
}
