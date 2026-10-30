import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

const ThemeContext = createContext(null);

// Las mismas claves y reglas las usa el script de index.html para pintar el tema antes de
// que cargue React.
const TEMA_KEY = "cmass:tema";
const MODO_KEY = "cmass:modo";
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

export const TEMAS = [
  { value: "default", label: "Default" },
  { value: "ribeiro", label: "Ribeiro" },
  { value: "turquesa", label: "Turquesa" },
];

// modo: "auto" (sigue al sistema, prefers-color-scheme; es el valor inicial), "claro" u
// "oscuro". En Inicio un botón con sol / luna pasa de claro a oscuro y viceversa.
const leer = (clave, porDefecto) => {
  try {
    return localStorage.getItem(clave) || porDefecto;
  } catch {
    return porDefecto;
  }
};

const guardar = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: vale para esta sesión */
  }
};

// Cambio de colores con un fundido suave (View Transitions) donde el navegador lo permite y
// la persona no pidió reducir el movimiento; si no, el cambio es directo.
function conFundido(cambio) {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reducir || document.visibilityState !== "visible") return cambio();
  const transicion = document.startViewTransition(() => flushSync(cambio));
  // Si el navegador la cancela (ej. la pestaña se oculta en el medio), el cambio igual se aplicó.
  transicion.ready.catch(() => {});
  transicion.finished.catch(() => {});
}

export function ThemeProvider({ children }) {
  const [tema, setTemaInterno] = useState(() => leer(TEMA_KEY, "default"));
  const [modo, setModoInterno] = useState(() => leer(MODO_KEY, "auto"));
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia(CONSULTA_OSCURO).matches);

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_OSCURO);
    const cambiar = () => setSistemaOscuro(mq.matches);
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, []);

  const esquema = modo === "oscuro" || (modo === "auto" && sistemaOscuro) ? "oscuro" : "claro";

  // useLayoutEffect: se aplica dentro del flushSync del fundido (antes de la "foto" nueva).
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.tema = tema;
    raiz.dataset.esquema = esquema;
    guardar(TEMA_KEY, tema);
    guardar(MODO_KEY, modo);
    // Color de la barra del navegador / sistema: sale de --theme-color del tema y modo.
    const meta = document.querySelector('meta[name="theme-color"]');
    const color = getComputedStyle(raiz).getPropertyValue("--theme-color").trim();
    if (meta && color) meta.setAttribute("content", color);
  }, [tema, modo, esquema]);

  const setTema = useCallback((valor) => conFundido(() => setTemaInterno(valor)), []);
  const setModo = useCallback((valor) => conFundido(() => setModoInterno(valor)), []);
  const alternarEsquema = useCallback(() => setModo(esquema === "oscuro" ? "claro" : "oscuro"), [esquema, setModo]);

  const value = useMemo(() => ({ tema, setTema, modo, setModo, esquema, alternarEsquema }), [tema, setTema, modo, setModo, esquema, alternarEsquema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
