import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useSync } from "../lib/useSync.js";
import logoRibeiro from "../assets/logo-ribeiro.png";

// Corta con "…" recién al final de la segunda línea.
const dosLineas = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
  overflowWrap: "anywhere",
};

export default function Header({ title, subtitle, onBack }) {
  const navigate = useNavigate();
  const { pendientes } = useSync();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(255,255,255,.95)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        padding: "11px 14px",
        paddingTop: "max(11px, env(safe-area-inset-top))",
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Volver"
          style={{
            width: 42,
            height: 42,
            flex: "0 0 42px",
            borderRadius: 14,
            border: 0,
            background: "var(--violet-150)",
            color: "var(--violet-800)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="back" size={20} strokeWidth={2.1} />
        </button>
      ) : (
        <div
          style={{
            width: 42,
            height: 42,
            flex: "0 0 42px",
            borderRadius: 14,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logoRibeiro}
            alt="Ribeiro"
            width={42}
            height={42}
            style={{ objectFit: "contain", display: "block" }}
          />
        </div>
      )}

      {/* Título y subtítulo pasan a una segunda línea antes de cortarse (en un celular de 360 px
          "Inspecciones de Obra Pública" no entra en una). */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="heading"
          style={{
            ...dosLineas,
            fontWeight: 700,
            fontSize: "clamp(15px, 4.4vw, 17.5px)",
            lineHeight: 1.2,
            letterSpacing: "-.35px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            ...dosLineas,
            fontSize: 11.5,
            lineHeight: 1.3,
            marginTop: 1,
            color: "var(--muted)",
          }}
        >
          {subtitle}
        </div>
      </div>

      <button
        onClick={() => navigate("/pendientes")}
        aria-label="Pendientes de sincronizar"
        style={{
          position: "relative",
          width: 42,
          height: 42,
          flex: "0 0 42px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "#fff",
          color: "var(--muted-3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="refresh" size={19} strokeWidth={1.8} />
        {pendientes > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "#E11D48",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 20,
              padding: "1.5px 6px",
              boxShadow: "0 3px 8px -2px rgba(225,29,72,.7)",
            }}
          >
            {pendientes}
          </span>
        ) : null}
      </button>
    </header>
  );
}
