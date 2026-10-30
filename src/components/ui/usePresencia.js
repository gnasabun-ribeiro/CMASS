import { useEffect, useState } from "react";

// Mantiene montado un elemento mientras dura su animación de salida. `estado`:
// "entrando" (recién montado, todavía en su posición inicial) → "abierto" → "cerrando".
// El CSS anima según `data-estado`.
export function usePresencia(abierto, duracionSalida = 280) {
  const [montado, setMontado] = useState(abierto);
  const [estado, setEstado] = useState(abierto ? "entrando" : "cerrado");

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      setEstado("entrando");
      let segundo;
      // Dos cuadros: el primero pinta la posición inicial, el segundo dispara la transición.
      const primero = requestAnimationFrame(() => {
        segundo = requestAnimationFrame(() => setEstado("abierto"));
      });
      return () => {
        cancelAnimationFrame(primero);
        cancelAnimationFrame(segundo);
      };
    }
    setEstado((e) => (e === "cerrado" ? e : "cerrando"));
    const t = setTimeout(() => {
      setMontado(false);
      setEstado("cerrado");
    }, duracionSalida);
    return () => clearTimeout(t);
  }, [abierto, duracionSalida]);

  return { montado: montado || abierto, estado };
}
