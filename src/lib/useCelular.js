import { useEffect, useState } from "react";

// Pantalla de celular (hasta 480 px de ancho, ej. Galaxy A55 = 360 px): las cards y los
// pasos del formulario se compactan para que no se corten.
const CONSULTA = "(max-width: 480px)";

export function useCelular() {
  const [celular, setCelular] = useState(() => window.matchMedia(CONSULTA).matches);

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const cambiar = () => setCelular(mq.matches);
    cambiar();
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, []);

  return celular;
}
