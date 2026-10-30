import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

const TEMA_KEY = "cmass:tema";
const TEMA_COLOR = { default: "#701C93", ribeiro: "#1C1B19", turquesa: "#0F7C79" };

export const TEMAS = [
  { value: "default", label: "Default" },
  { value: "ribeiro", label: "Ribeiro" },
  { value: "turquesa", label: "Turquesa" },
];

// Adorno de fondo de las cards de módulo (dibujado en index.css según `data-fondo` en <html>).
// PROVISORIO: están todas para compararlas desde el selector de Home; cuando se elija una,
// queda solo esa en index.css y se quita el selector.
const FONDO_KEY = "cmass:fondo-card";

export const FONDOS = [
  { value: "circulo", label: "Círculo" },
  { value: "anillos", label: "Anillos" },
  { value: "resplandor", label: "Resplandor" },
  { value: "puntos", label: "Puntos" },
  { value: "cinta", label: "Cinta de seguridad" },
  { value: "onda", label: "Onda" },
  { value: "ninguno", label: "Sin adorno" },
];

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem(TEMA_KEY) || "default");
  const [fondo, setFondo] = useState(() => localStorage.getItem(FONDO_KEY) || "circulo");

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(TEMA_KEY, tema);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", TEMA_COLOR[tema] || TEMA_COLOR.default);
  }, [tema]);

  useEffect(() => {
    document.documentElement.dataset.fondo = fondo;
    localStorage.setItem(FONDO_KEY, fondo);
  }, [fondo]);

  const value = useMemo(() => ({ tema, setTema, fondo, setFondo }), [tema, fondo]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
