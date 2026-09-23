import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { ESTADOS, ESTADO_COLORS, REGISTROS, hallazgosColor } from "../data/mockRegistros.js";
import { findModulo, findSub } from "../data/modulos.js";

export default function Lista() {
  const { moduloId, subId } = useParams();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("Todos");

  const modulo = moduloId ? findModulo(moduloId) : null;
  const sub = moduloId && subId ? findSub(moduloId, subId) : null;

  let title = "Mis Registros";
  let subtitle = "Filtrá por área, fecha y estado";
  let backTo = "/";
  if (sub) {
    title = sub.title;
    subtitle = sub.meta;
    backTo = `/modulos/${moduloId}`;
  } else if (modulo) {
    title = `${modulo.title} — Registros`;
    subtitle = "Filtrá por área, fecha y estado";
  }

  const registros = useMemo(
    () => (filtro === "Todos" ? REGISTROS : REGISTROS.filter((r) => r.estado === filtro)),
    [filtro]
  );

  return (
    <AppShell title={title} subtitle={subtitle} onBack={() => navigate(backTo)}>
      <div
        style={{
          background: "#fff",
          borderRadius: 22,
          padding: 13,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
          marginBottom: 13,
          boxShadow: "var(--shadow-panel)",
        }}
      >
        <label style={{ flex: "1 1 180px", minWidth: 0 }}>
          <FieldLabel>Área</FieldLabel>
          <select defaultValue="" style={fieldStyle}>
            <option value="">Todas las áreas</option>
            <option>Planta Norte</option>
            <option>Yacimiento Sur</option>
            <option>Obra Vial RN-40</option>
          </select>
        </label>
        <label style={{ flex: "1 1 130px", minWidth: 0 }}>
          <FieldLabel>Desde</FieldLabel>
          <input type="date" defaultValue="2026-08-31" style={fieldStyle} />
        </label>
        <label style={{ flex: "1 1 130px", minWidth: 0 }}>
          <FieldLabel>Hasta</FieldLabel>
          <input type="date" defaultValue="2026-09-08" style={fieldStyle} />
        </label>
        <button
          style={{
            flex: "1 1 120px",
            border: 0,
            background: "var(--active-bg)",
            color: "var(--on-active)",
            fontWeight: 700,
            fontSize: 13.5,
            padding: 12,
            borderRadius: 14,
            cursor: "pointer",
            minHeight: 48,
          }}
        >
          Filtrar
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
        {ESTADOS.map((f) => {
          const on = filtro === f;
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                flex: "0 0 auto",
                border: 0,
                background: on ? "var(--active-bg)" : "#fff",
                color: on ? "var(--on-active)" : "var(--muted-3)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "10px 15px",
                borderRadius: 20,
                cursor: "pointer",
                minHeight: 42,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {registros.map((r, i) => {
          const estadoColor = ESTADO_COLORS[r.estado];
          return (
            <button
              key={`${r.dia}-${r.titulo}`}
              className="pop-in"
              style={{
                textAlign: "left",
                border: 0,
                width: "100%",
                background: "#fff",
                borderRadius: 20,
                padding: 14,
                display: "flex",
                gap: 13,
                alignItems: "center",
                flexWrap: "wrap",
                cursor: "pointer",
                boxShadow: "0 12px 24px -22px rgba(36,18,70,.5)",
                animationDelay: `${i * 0.045}s`,
              }}
            >
              <span
                style={{
                  width: 50,
                  height: 50,
                  flex: "0 0 50px",
                  borderRadius: 16,
                  background: "var(--violet-75)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                <span className="heading" style={{ fontWeight: 800, fontSize: 16, color: "var(--violet-800)" }}>
                  {r.dia}
                </span>
                <span style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginTop: 2 }}>
                  {r.mes}
                </span>
              </span>
              <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                <span className="heading" style={{ display: "block", fontWeight: 700, fontSize: 14.5, letterSpacing: "-.15px" }}>
                  {r.titulo}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted-2)", marginTop: 2 }}>{r.detalle}</span>
              </span>
              <span style={{ flex: "0 0 auto", textAlign: "center" }}>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)" }}>Hallazgos</span>
                <span className="heading" style={{ display: "block", fontWeight: 800, fontSize: 17, color: hallazgosColor(r.hallazgos) }}>
                  {r.hallazgos}
                </span>
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  background: estadoColor.bg,
                  color: estadoColor.fg,
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "6px 12px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                }}
              >
                {r.estado}
              </span>
            </button>
          );
        })}
        {registros.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--violet-150)", padding: "24px 0", fontSize: 13.5 }}>
            No hay registros con este filtro.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function FieldLabel({ children }) {
  return (
    <span
      style={{
        display: "block",
        fontSize: 10.5,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--muted)",
        fontWeight: 600,
        marginBottom: 5,
      }}
    >
      {children}
    </span>
  );
}

const fieldStyle = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 12,
  fontSize: 14,
  background: "var(--violet-25)",
  color: "var(--ink)",
  minHeight: 48,
};
