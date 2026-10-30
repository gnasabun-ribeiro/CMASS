import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import IconoAnimado from "./IconoAnimado.jsx";
import { useCelular } from "../lib/useCelular.js";

// Grilla de las cards en el celular: una por fila y todas de la misma altura (la de la más alta).
export const GRILLA_CELULAR = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gridAutoRows: "1fr",
  gap: "var(--space-4)",
};

// Medidas de la card. En el celular, la misma card que en la computadora pero con tamaños en vw,
// para que mantenga la proporción en cualquier celular (360 px → título de ~17 px, ícono de ~52 px;
// elegido por la usuaria, por eso no usa la escala tipográfica fija).
const MEDIDAS = {
  escritorio: {
    padding: "var(--space-6)",
    gap: "var(--space-4)",
    radius: "var(--radius-2xl)",
    minHeight: 228,
    icono: 64,
    iconoRadius: "var(--radius-xl)",
    iconoTamano: 32,
    titulo: "var(--text-title)",
    descripcion: "var(--text-callout)",
    cta: "var(--text-callout)",
  },
  celular: {
    padding: "clamp(16px, 5vw, 20px)",
    gap: "var(--space-3)",
    radius: "var(--radius-xl)",
    minHeight: 0,
    icono: "clamp(46px, 14.5vw, 56px)",
    iconoRadius: "var(--radius-lg)",
    iconoTamano: "50%",
    titulo: "clamp(15.5px, 4.7vw, 18.5px)",
    descripcion: "clamp(12px, 3.6vw, 13.5px)",
    cta: "var(--text-footnote)",
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
      {/* Adorno de fondo: lo dibuja index.css, uno distinto por tema. */}
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
            boxShadow: "var(--shadow-1)",
            transition: "background .2s, color .2s",
          }}
        >
          {iconoAnimado ? (
            // La primera vuelta, en cascada después de la animación de entrada de las cards (pop-in).
            <IconoAnimado icono={iconoAnimado} reproducir={reproducir} demora={450 + index * 120} />
          ) : (
            <Icon name={modulo.icon} size={m.iconoTamano} />
          )}
        </span>
        {modulo.badge ? <span className="chip chip--accent">{modulo.badge}</span> : null}
      </span>

      <span style={{ position: "relative", flex: 1, display: "block" }}>
        <span
          className="heading card-title"
          style={{
            display: "block",
            fontWeight: "var(--weight-heavy)",
            fontSize: m.titulo,
            lineHeight: "var(--leading-title)",
            letterSpacing: "var(--tracking-title)",
            transition: "color .2s",
          }}
        >
          {modulo.title}
        </span>
        <span
          // En el celular, a lo sumo dos líneas: así ninguna card queda mucho más alta que las demás.
          className={celular ? "clamp-2" : undefined}
          style={{
            display: celular ? undefined : "block",
            fontSize: m.descripcion,
            color: "var(--card-desc)",
            lineHeight: "var(--leading-body)",
            marginTop: "var(--space-1-5)",
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
          gap: "var(--space-2)",
          color: "var(--card-accent)",
          fontSize: m.cta,
          fontWeight: "var(--weight-bold)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, whiteSpace: "nowrap" }}>
          {modulo.cta}
          <Icon name="arrowRight" size={16} />
        </span>
        {hasList ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              if (e.detail <= 1) onRegistros();
            }}
            style={{ flexShrink: 0, minHeight: "var(--touch-min)" }}
          >
            Registros
          </button>
        ) : null}
      </span>
    </div>
  );
}
