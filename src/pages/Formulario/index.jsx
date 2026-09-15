import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { findModulo, findSub, PASOS } from "../../data/modulos.js";
import PasoGenerales from "./PasoGenerales.jsx";
import PasoChecklist from "./PasoChecklist.jsx";
import PasoHallazgos from "./PasoHallazgos.jsx";
import PasoCierre from "./PasoCierre.jsx";
import { getChecklist } from "../../data/checklist.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabaseConfigured } from "../../lib/supabaseClient.js";
import { crearBorradorObra, guardarGeneralesObra, guardarRespuestaChecklist, marcarEnviadaObra } from "../../lib/inspeccionesObra.js";

const GENERALES_INICIALES = { cliente: "", ubicacion: "", grupoAuditado: "", fechaHora: "", tareaObservada: "" };

function formatoGuardado(fecha, error) {
  if (error) return "Error al guardar";
  if (!fecha) return "sin guardar";
  const segundos = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 1000));
  if (segundos < 5) return "recién";
  if (segundos < 60) return `hace ${segundos}s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.round(minutos / 60)} h`;
}

export default function Formulario() {
  const { moduloId, subId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNested = location.pathname.startsWith("/modulos/");
  const { userId } = useAuth();

  const modulo = findModulo(moduloId);
  const sub = isNested ? findSub(moduloId, subId) : null;
  const checklist = useMemo(() => getChecklist(moduloId), [moduloId]);
  const persisteEnSupabase = moduloId === "obra" && !isNested && supabaseConfigured;

  const [paso, setPaso] = useState(0);
  const [generales, setGenerales] = useState(GENERALES_INICIALES);
  const [respuestas, setRespuestas] = useState({});
  const [hallazgos, setHallazgos] = useState([]);
  const [inspeccionId, setInspeccionId] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const creandoBorradorRef = useRef(false);

  // Crea la inspección (estado "borrador") apenas hay usuario, para tener un
  // id al que colgar las respuestas del checklist y los datos de Generales.
  useEffect(() => {
    if (!persisteEnSupabase || !userId || inspeccionId || creandoBorradorRef.current) return;
    creandoBorradorRef.current = true;
    crearBorradorObra(userId)
      .then(setInspeccionId)
      .catch((err) => {
        creandoBorradorRef.current = false;
        setErrorGuardado(err.message);
      });
  }, [persisteEnSupabase, userId, inspeccionId]);

  // Guarda los campos de Generales con un pequeño debounce mientras se escribe.
  useEffect(() => {
    if (!persisteEnSupabase || !inspeccionId) return;
    const timeout = setTimeout(() => {
      guardarGeneralesObra(inspeccionId, generales)
        .then(() => {
          setGuardadoEn(new Date());
          setErrorGuardado(null);
        })
        .catch((err) => setErrorGuardado(err.message));
    }, 800);
    return () => clearTimeout(timeout);
  }, [persisteEnSupabase, inspeccionId, generales]);

  if (!modulo || (isNested && !sub)) return <Navigate to="/" replace />;

  const backTo = isNested ? `/modulos/${moduloId}` : "/";
  const title = sub ? sub.title : modulo.title;

  const responderChecklist = (item, valor) => {
    setRespuestas((r) => ({ ...r, [item.codigo]: valor }));
    if (!persisteEnSupabase || !inspeccionId) return;
    guardarRespuestaChecklist(inspeccionId, item, valor)
      .then(() => {
        setGuardadoEn(new Date());
        setErrorGuardado(null);
      })
      .catch((err) => setErrorGuardado(err.message));
  };

  const noCumple = Object.values(respuestas).filter((v) => v === "no").length;
  const contestadas = Object.keys(respuestas).length;

  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${checklist.length}`, color: "var(--violet-700)" },
    { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
    { label: "Fotos adjuntas", value: "4", color: "var(--ink)" },
    {
      label: "Guardado",
      value: persisteEnSupabase ? formatoGuardado(guardadoEn, errorGuardado) : "hace 1 min",
      color: errorGuardado ? "var(--danger-fg)" : "var(--muted-4)",
    },
  ];

  const avance = Math.round((paso / 3) * 100);
  const esUltimo = paso === 3;

  const siguiente = () => {
    if (!esUltimo) {
      setPaso((p) => Math.min(3, p + 1));
      return;
    }
    if (persisteEnSupabase && inspeccionId) {
      marcarEnviadaObra(inspeccionId).catch((err) => setErrorGuardado(err.message));
    }
    navigate(backTo);
  };

  const guardarBorrador = () => {
    if (persisteEnSupabase && inspeccionId) {
      guardarGeneralesObra(inspeccionId, generales)
        .then(() => {
          setGuardadoEn(new Date());
          setErrorGuardado(null);
        })
        .catch((err) => setErrorGuardado(err.message));
    }
    navigate(backTo);
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
        {paso === 0 ? (
          <PasoGenerales valores={generales} onCambiar={(campo, valor) => setGenerales((g) => ({ ...g, [campo]: valor }))} />
        ) : null}
        {paso === 1 ? <PasoChecklist items={checklist} respuestas={respuestas} onResponder={responderChecklist} /> : null}
        {paso === 2 ? <PasoHallazgos hallazgos={hallazgos} onAgregar={(h) => setHallazgos((list) => [...list, h])} /> : null}
        {paso === 3 ? <PasoCierre resumen={resumen} /> : null}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 78, padding: "0 14px", zIndex: 25, pointerEvents: "none" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", display: "flex", gap: 9, pointerEvents: "auto" }}>
          <button
            onClick={guardarBorrador}
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
