import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import IconoAnimado from "./IconoAnimado.jsx";
import { useCelular } from "../lib/useCelular.js";

// Grilla de las cards en el celular: una por fila y todas de la misma altura (la de la más alta).
export const GRILLA_CELULAR = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gridAutoRows: "1fr",
  gap: 14,
};

// Medidas de la card. En el celular, la misma card que en la computadora pero con tamaños en vw,
// para que mantenga la proporción en cualquier celular (360 px → título de ~17 px, ícono de ~52 px).
const MEDIDAS = {
  escritorio: {
    padding: 22,
    gap: 14,
    radius: 26,
    minHeight: 226,
    icono: 64,
    iconoRadius: 20,
    iconoTamano: 32,
    titulo: 19.5,
    descripcion: 13.5,
    cta: 13.5,
  },
  celular: {
    padding: "clamp(16px, 5vw, 20px)",
    gap: 12,
    radius: 22,
    minHeight: 0,
    icono: "clamp(46px, 14.5vw, 56px)",
    iconoRadius: 16,
    iconoTamano: "50%",
    titulo: "clamp(15.5px, 4.7vw, 18.5px)",
    descripcion: "clamp(12px, 3.6vw, 13.5px)",
    cta: 13,
  },
};

// `iconoAnimado` (data/iconosAnimados.js, lo pasan Home e Inspecciones): reemplaza al ícono de línea. Cuándo se
// anima lo decide IconoAnimado; desde acá solo se le avisa al pasar el mouse.
export default function ModuleCard({ modulo, index = 0, onOpen, onRegistros, iconoAnimado }) {
  const hasList = Boolean(modulo.form);
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(null);
  const [reproducir, setReproducir] = useState(0);
  const cardRef = useRef(null);
  const celular = useCelular();
  const m = celular ? MEDIDAS.celular : MEDIDAS.escritorio;

  const handleOpen = (e) => {
    const el = cardRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = e && typeof e.clientX === "number" ? e.clientX - rect.left : rect.width / 2;
      const y = e && typeof e.clientY === "number" ? e.clientY - rect.top : rect.height / 2;
      const size = 2 * Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
      setRipple({ x, y, size, key: Date.now() });
    }
    setPressed(true);
    setTimeout(onOpen, 180);
  };

  return (
    <div
      ref={cardRef}
      // e.detail > 1: segundo clic de un doble clic (navegaba dos veces y "Atrás" no volvía).
      onClick={(e) => e.detail <= 1 && handleOpen(e)}
      onMouseEnter={iconoAnimado ? () => setReproducir((n) => n + 1) : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // Enter sobre "Registros" no abre también la card
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={`pop-in card-tap${pressed ? " is-pressed" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
        border: "3px solid var(--card-border)",
        borderRadius: m.radius,
        background: "var(--card-bg)",
        color: "var(--card-title)",
        padding: m.padding,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: m.gap,
        minHeight: m.minHeight,
        boxShadow: "var(--shadow-card)",
        animationDelay: `${index * 0.045}s`,
      }}
    >
      {/* Adorno de fondo: lo dibuja index.css según el `data-fondo` de <html>. */}
      <span className="card-decor" aria-hidden="true" />
      {ripple ? (
        <span
          key={ripple.key}
          className="ripple"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          className={`card-icon${pressed ? " icon-pulse" : ""}`}
          style={{
            width: m.icono,
            height: m.icono,
            borderRadius: m.iconoRadius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--card-accent-bg)",
            color: "var(--card-accent)",
            boxShadow: "0 8px 18px -10px rgba(36,18,70,.5)",
            transition: "background .2s, color .2s",
          }}
        >
          {iconoAnimado ? (
            // La primera vuelta, en cascada después de la animación de entrada de las cards (pop-in).
            <IconoAnimado icono={iconoAnimado} reproducir={reproducir} demora={450 + index * 120} />
          ) : (
            <Icon name={modulo.icon} size={m.iconoTamano} strokeWidth={1.5} />
          )}
        </span>
        {modulo.badge ? (
          <span
            style={{
              background: "var(--violet-50)",
              color: "var(--violet-800)",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 20,
              padding: "5px 12px",
              whiteSpace: "nowrap",
            }}
          >
            {modulo.badge}
          </span>
        ) : null}
      </span>

      <span style={{ position: "relative", flex: 1, display: "block" }}>
        <span
          className="heading card-title"
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: m.titulo,
            lineHeight: 1.2,
            letterSpacing: "-.35px",
            transition: "color .2s",
          }}
        >
          {modulo.title}
        </span>
        <span
          style={{
            fontSize: m.descripcion,
            color: "var(--card-desc)",
            lineHeight: 1.5,
            marginTop: 6,
            // En el celular, a lo sumo dos líneas: así ninguna card queda mucho más alta que las demás.
            ...(celular
              ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }
              : { display: "block" }),
          }}
        >
          {modulo.desc}
        </span>
      </span>

      <span
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 9,
          color: "var(--card-accent)",
          fontSize: m.cta,
          fontWeight: 700,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, whiteSpace: "nowrap" }}>
          {modulo.cta}
          <Icon name="arrowRight" size={16} strokeWidth={2.2} />
        </span>
        {hasList ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (e.detail <= 1) onRegistros();
            }}
            style={{
              flexShrink: 0,
              border: 0,
              background: "var(--violet-50)",
              color: "var(--violet-800)",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "10px 15px",
              borderRadius: 13,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Registros
          </button>
        ) : null}
      </span>
    </div>
  );
}
