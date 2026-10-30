import { useEffect, useState } from "react";
import { BREAKPOINTS } from "./breakpoints.js";

// Forma de la navegación (`data-nav` en <html>, ver "Navegación" en componentes.css):
//   menos de 768 px → "barra" (inferior). Desde 768: "compacta" (riel) o "expandida" (lateral),
//   según lo que eligió la persona con el botón del menú (localStorage `cmass:nav`); si nunca
//   eligió, compacta en tablet y expandida desde 1024. El script de index.html hace la misma
//   cuenta antes de dibujar (sin saltos al cargar).
const CLAVE = "cmass:nav";
const LATERAL = `(min-width: ${BREAKPOINTS.md}px)`;
const ANCHA = `(min-width: ${BREAKPOINTS.lg}px)`;

const leerPreferencia = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

function resolver(preferencia) {
  if (!window.matchMedia(LATERAL).matches) return "barra";
  if (preferencia === "compacta" || preferencia === "expandida") return preferencia;
  return window.matchMedia(ANCHA).matches ? "expandida" : "compacta";
}

// [modo, alternar]: el modo actual y la función que pasa de riel a lateral (y lo recuerda).
export function useNavegacion() {
  const [preferencia, setPreferencia] = useState(leerPreferencia);
  const [modo, setModo] = useState(() => resolver(preferencia));

  useEffect(() => {
    const actualizar = () => setModo(resolver(preferencia));
    actualizar();
    const consultas = [window.matchMedia(LATERAL), window.matchMedia(ANCHA)];
    consultas.forEach((mq) => mq.addEventListener("change", actualizar));
    return () => consultas.forEach((mq) => mq.removeEventListener("change", actualizar));
  }, [preferencia]);

  useEffect(() => {
    document.documentElement.dataset.nav = modo;
  }, [modo]);

  const alternar = () => {
    const nueva = modo === "expandida" ? "compacta" : "expandida";
    try {
      localStorage.setItem(CLAVE, nueva);
    } catch {
      /* sin almacenamiento: vale para esta sesión */
    }
    setPreferencia(nueva);
  };

  return [modo, alternar];
}
