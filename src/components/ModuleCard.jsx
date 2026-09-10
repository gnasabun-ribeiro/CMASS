import { useRef, useState } from "react";
import Icon from "./Icon.jsx";

export default function ModuleCard({ modulo, index = 0, onOpen, onRegistros }) {
  const hasList = Boolean(modulo.form);
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(null);
  const cardRef = useRef(null);

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
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleOpen();
      }}
      className={`pop-in card-tap${pressed ? " is-pressed" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
        border: "3px solid transparent",
        borderRadius: 26,
        background: "#fff",
        color: "var(--ink)",
        padding: 22,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 226,
        boxShadow: "var(--shadow-card)",
        animationDelay: `${index * 0.045}s`,
      }}
    >
      <span
        style={{
          position: "absolute",
          right: -38,
          top: -38,
          width: 148,
          height: 148,
          borderRadius: "50%",
          background: "rgba(112,28,147,.09)",
        }}
      />
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
          className={pressed ? "icon-pulse" : undefined}
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--violet-50)",
            color: "var(--violet-800)",
            boxShadow: "0 8px 18px -10px rgba(36,18,70,.5)",
          }}
        >
          <Icon name={modulo.icon} size={32} strokeWidth={1.5} />
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
          className="heading"
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: 19.5,
            lineHeight: 1.2,
            letterSpacing: "-.35px",
          }}
        >
          {modulo.title}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 13.5,
            color: "#5c5570",
            lineHeight: 1.5,
            marginTop: 6,
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
          color: "var(--violet-800)",
          fontSize: 13.5,
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
              onRegistros();
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
