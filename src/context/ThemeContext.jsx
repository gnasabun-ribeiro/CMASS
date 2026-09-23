import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

const TEMA_KEY = "cmass:tema";
const TEMA_COLOR = { default: "#701C93", ribeiro: "#1C1B19" };

export const TEMAS = [
  { value: "default", label: "Default" },
  { value: "ribeiro", label: "Ribeiro" },
];

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem(TEMA_KEY) || "default");

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(TEMA_KEY, tema);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", TEMA_COLOR[tema] || TEMA_COLOR.default);
  }, [tema]);

  const value = useMemo(() => ({ tema, setTema }), [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
