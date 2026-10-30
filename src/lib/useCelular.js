import { CONSULTA_CELULAR, useMediaQuery } from "./breakpoints.js";

// Pantalla de celular (menos de 640 px de ancho, el breakpoint `sm`; ej. Galaxy A55 = 360 px):
// las cards y los pasos del formulario se compactan para que no se corten. Los estilos son
// inline y no pueden llevar media queries: por eso este hook.
export function useCelular() {
  return useMediaQuery(CONSULTA_CELULAR);
}
