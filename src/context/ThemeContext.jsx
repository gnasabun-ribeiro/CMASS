import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

// Automático sigue al sistema (prefers-color-scheme).
export const MODOS = [
  { value: "auto", label: "Auto" },
  { value: "claro", label: "Claro" },
  { value: "oscuro", label: "Oscuro" },
];

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

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => leer(TEMA_KEY, "default"));
  const [modo, setModo] = useState(() => leer(MODO_KEY, "auto"));
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia(CONSULTA_OSCURO).matches);

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_OSCURO);
    const cambiar = () => setSistemaOscuro(mq.matches);
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, []);

  const esquema = modo === "oscuro" || (modo === "auto" && sistemaOscuro) ? "oscuro" : "claro";

  useEffect(() => {
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

  const value = useMemo(() => ({ tema, setTema, modo, setModo, esquema }), [tema, modo, esquema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
