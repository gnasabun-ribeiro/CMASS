import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { findModulo, findSub, PASOS } from "../../data/modulos.js";
import PasoGenerales from "./PasoGenerales.jsx";
import PasoChecklist from "./PasoChecklist.jsx";
import PasoHallazgos from "./PasoHallazgos.jsx";
import PasoCierre from "./PasoCierre.jsx";
import { CHECKLIST_BASE } from "../../data/checklist.js";

const HALLAZGOS_INICIALES = [
  {
    titulo: "Falta bloqueo en bomba B-12",
    severidad: "Crítico",
    sevBg: "var(--danger-bg)",
    sevFg: "var(--danger-fg)",
    detalle: "El equipo quedó sin tarjeta de bloqueo durante la intervención mecánica.",
    responsable: "J. Alcaraz",
    vence: "11/09/2026",
  },
  {
    titulo: "Contenedor de residuos sin rótulo",
    severidad: "Medio",
    sevBg: "var(--warn-bg)",
    sevFg: "var(--warn-fg)",
    detalle: "Contenedor de trapos contaminados sin identificación de corriente.",
    responsable: "S. Duarte",
    vence: "18/09/2026",
  },
];

export default function Formulario() {
  const { moduloId, subId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNested = location.pathname.startsWith("/modulos/");

  const modulo = findModulo(moduloId);
  const sub = isNested ? findSub(moduloId, subId) : null;

  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [hallazgos, setHallazgos] = useState(HALLAZGOS_INICIALES);

  if (!modulo || (isNested && !sub)) return <Navigate to="/" replace />;

  const backTo = isNested ? `/modulos/${moduloId}` : "/";
  const title = sub ? sub.title : modulo.title;

  const noCumple = Object.values(respuestas).filter((v) => v === "no").length;
  const contestadas = Object.keys(respuestas).length;

  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${CHECKLIST_BASE.length}`, color: "var(--violet-700)" },
    { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
    { label: "Fotos adjuntas", value: "4", color: "var(--ink)" },
    { label: "Guardado", value: "hace 1 min", color: "var(--muted-4)" },
  ];

  const avance = Math.round((paso / 3) * 100);
  const esUltimo = paso === 3;

  const siguiente = () => {
    if (!esUltimo) setPaso((p) => Math.min(3, p + 1));
    else navigate(backTo);
  };

  const pasos = useMemo(
    () =>
      PASOS.map((label, i) => ({
        label,
        n: i + 1,
        on: paso === i,
        done: i < paso,
      })),
    [paso]
  );

  return (
    <AppShell title={title} subtitle="Formulario en 4 pasos" onBack={() => navigate(backTo)} padBottom="200px">
      <div style={{ background: "#fff", borderRadius: 22, padding: 14, marginBottom: 12, boxShadow: "var(--shadow-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <span className="heading" style={{ fontWeight: 700, fontSize: 14 }}>
            Paso {paso + 1} de 4 · {PASOS[paso]}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{avance}%</span>
        </div>
        <div style={{ height: 9, background: "#f0e0f7", borderRadius: 20, overflow: "hidden", marginBottom: 11 }}>
          <div
            style={{
              height: "100%",
              borderRadius: 20,
              background: "var(--brand-gradient)",
              transition: "width .45s cubic-bezier(.2,.8,.2,1)",
              width: `${avance}%`,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
          {pasos.map((p) => (
            <button
              key={p.label}
              onClick={() => setPaso(p.n - 1)}
              style={{
                flex: "0 0 auto",
                border: 0,
                background: p.on ? "var(--violet-700)" : p.done ? "var(--violet-150)" : "var(--violet-50)",
                color: p.on ? "#fff" : p.done ? "var(--violet-800)" : "var(--muted)",
                borderRadius: 20,
                padding: "10px 15px",
                cursor: "pointer",
                minHeight: 44,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {p.n}. {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="app-screen" style={{ background: "#fff", borderRadius: 22, padding: 16, boxShadow: "0 12px 30px -24px rgba(36,18,70,.5)" }}>
        {paso === 0 ? <PasoGenerales /> : null}
        {paso === 1 ? (
          <PasoChecklist respuestas={respuestas} onResponder={(codigo, valor) => setRespuestas((r) => ({ ...r, [codigo]: valor }))} />
        ) : null}
        {paso === 2 ? <PasoHallazgos hallazgos={hallazgos} onAgregar={(h) => setHallazgos((list) => [...list, h])} /> : null}
        {paso === 3 ? <PasoCierre resumen={resumen} /> : null}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 78, padding: "0 14px", zIndex: 25, pointerEvents: "none" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", display: "flex", gap: 9, pointerEvents: "auto" }}>
          <button
            onClick={() => navigate(backTo)}
            style={{
              border: 0,
              background: "#fff",
              color: "var(--violet-800)",
              fontWeight: 700,
              fontSize: 13.5,
              padding: "15px 18px",
              borderRadius: 18,
              cursor: "pointer",
              minHeight: 52,
              boxShadow: "var(--shadow-float)",
            }}
          >
            Borrador
          </button>
          <button
            onClick={siguiente}
            style={{
              flex: 1,
              border: 0,
              background: "var(--brand-gradient)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14.5,
              padding: "15px 18px",
              borderRadius: 18,
              cursor: "pointer",
              minHeight: 52,
              boxShadow: "var(--shadow-cta)",
            }}
          >
            {esUltimo ? "Cerrar y enviar" : "Siguiente"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
