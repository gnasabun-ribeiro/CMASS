import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { ESTADOS, ESTADO_COLORS, hallazgosColor } from "../data/mockRegistros.js";
import { findModulo, findSub } from "../data/modulos.js";
import { supabaseConfigured } from "../lib/supabaseClient.js";
import { listarInspeccionesObra } from "../lib/inspeccionesObra.js";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function aRegistro(r) {
  const f = new Date(r.fecha_hora || r.created_at);
  return {
    id: r.id,
    fecha: f,
    dia: String(f.getDate()).padStart(2, "0"),
    mes: MESES[f.getMonth()],
    titulo: `Inspección de Obra — ${r.cliente || "Sin cliente"}`,
    detalle: [r.ubicacion, r.grupo_auditado].filter(Boolean).join(" · ") || "Sin datos generales",
    hallazgos: r.hallazgos,
    estado: r.estado === "enviado" ? "Enviado" : "Borrador",
  };
}

export default function Lista() {
  const { moduloId, subId } = useParams();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("Todos");

  const modulo = moduloId ? findModulo(moduloId) : null;
  const sub = moduloId && subId ? findSub(moduloId, subId) : null;

  let title = "Mis Registros";
  let subtitle = "Registros cargados";
  let backTo = "/";
  if (sub) {
    title = sub.title;
    subtitle = "Registros cargados";
    backTo = `/modulos/${moduloId}`;
  } else if (modulo) {
    title = `${modulo.title} — Registros`;
    subtitle = "Registros cargados";
  }

  // Solo Obra Pública guarda en Supabase por ahora; el listado general ("Mis Registros") también la muestra.
  const listaObra = !sub && (!moduloId || moduloId === "obra") && supabaseConfigured;
  const [todos, setTodos] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState(listaObra ? "cargando" : "ok");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    if (!listaObra) return;
    let cancelado = false;
    listarInspeccionesObra()
      .then((rows) => {
        if (cancelado) return;
        // Descarta borradores vacíos (se crean al entrar al formulario y nunca se completaron).
        const utiles = rows.filter(
          (r) => r.estado === "enviado" || r.cliente || r.ubicacion || r.grupo_auditado || r.tarea_observada || r.hallazgos || r.respuestas
        );
        setTodos(utiles.map(aRegistro));
        setEstadoCarga("ok");
      })
      .catch(() => !cancelado && setEstadoCarga("error"));
    return () => {
      cancelado = true;
    };
  }, [listaObra]);

  const registros = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const d = desde ? new Date(`${desde}T00:00:00`) : null;
    const h = hasta ? new Date(`${hasta}T23:59:59`) : null;
    return todos.filter(
      (r) =>
        (filtro === "Todos" || r.estado === filtro) &&
        (!q || `${r.titulo} ${r.detalle}`.toLowerCase().includes(q)) &&
        (!d || r.fecha >= d) &&
        (!h || r.fecha <= h)
    );
  }, [todos, filtro, busqueda, desde, hasta]);

  return (
    <AppShell title={title} subtitle={subtitle} onBack={() => navigate(backTo)}>
      <div style={{ background: "#fff", borderRadius: 22, padding: 13, display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 13, boxShadow: "var(--shadow-panel)" }}>
        <input
          placeholder="Buscar por cliente, ubicación o grupo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...fieldStyle, flex: "2 1 220px" }}
        />
        <input type="date" aria-label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ ...fieldStyle, flex: "1 1 140px" }} />
        <input type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...fieldStyle, flex: "1 1 140px" }} />
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
              key={r.id}
              onClick={() => navigate(`/form/obra?id=${r.id}`)}
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
            {estadoCarga === "cargando" ? "Cargando…" : estadoCarga === "error" ? "No se pudieron cargar los registros." : "Todavía no hay registros para mostrar."}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

const fieldStyle = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 12,
  fontSize: 14,
  background: "var(--violet-25)",
  color: "var(--ink)",
  minHeight: 48,
  minWidth: 0,
};
