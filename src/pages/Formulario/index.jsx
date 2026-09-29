import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { findModulo, findSub, PASOS } from "../../data/modulos.js";
import PasoGenerales from "./PasoGenerales.jsx";
import PasoChecklist from "./PasoChecklist.jsx";
import PasoHallazgos from "./PasoHallazgos.jsx";
import PasoCierre from "./PasoCierre.jsx";
import { getChecklist } from "../../data/checklist.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabaseConfigured } from "../../lib/supabaseClient.js";
import { armarHallazgo } from "../../data/severidades.js";
import { comprimirImagen, urlsFirmadas } from "../../lib/fotosChecklist.js";
import {
  agregarHallazgo as agregarHallazgoLocal,
  borrarHallazgo as borrarHallazgoLocal,
  cambiarNombreFirma,
  cargarInspeccion,
  guardarFirma as guardarFirmaLocal,
  guardarFoto as guardarFotoLocal,
  guardarGenerales,
  guardarRespuesta,
  marcarEnviada,
  nuevaInspeccion,
  quitarFoto as quitarFotoLocal,
} from "../../lib/inspeccionesLocal.js";
import { useSync } from "../../lib/useSync.js";

const GENERALES_INICIALES = { cliente: "", ubicacion: "", grupoAuditado: "", fechaHora: "", tareaObservada: "" };

function textoGuardado({ error, guardadoEn, sync }) {
  if (error) return "Error al guardar";
  if (!guardadoEn) return "sin cambios";
  if (sync.pendientes === 0) return "sincronizado";
  return sync.online ? `en el dispositivo · ${sync.pendientes} por enviar` : "en el dispositivo · sin conexión";
}

export default function Formulario() {
  const { moduloId, subId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNested = location.pathname.startsWith("/modulos/");
  const { userId, nombre: nombreInspector } = useAuth();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id"); // retomar una inspección existente
  const sync = useSync();

  const modulo = findModulo(moduloId);
  const sub = isNested ? findSub(moduloId, subId) : null;
  const checklist = useMemo(() => getChecklist(moduloId, subId), [moduloId, subId]);
  const persisteEnSupabase = moduloId === "obra" && !isNested && supabaseConfigured;

  const [paso, setPaso] = useState(0);
  const [generales, setGenerales] = useState(GENERALES_INICIALES);
  const [respuestas, setRespuestas] = useState({});
  const [hallazgos, setHallazgos] = useState([]);
  const [inspeccionId, setInspeccionId] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [fotos, setFotos] = useState({}); // codigo -> { url }
  const [subiendoFoto, setSubiendoFoto] = useState({});
  const [firmas, setFirmas] = useState({}); // rol -> { nombre, url }
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [guardandoFirma, setGuardandoFirma] = useState({});
  const [avisoCierre, setAvisoCierre] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(persisteEnSupabase);

  const nuevaRef = useRef(null); // promesa de la inspección nueva (evita crearla dos veces con StrictMode)
  const generalesRef = useRef(GENERALES_INICIALES);
  const generalesSuciosRef = useRef(false);
  const timerGeneralesRef = useRef(null);
  const urlsCreadasRef = useRef([]);

  const errorEnvio = inspeccionId ? sync.errores[inspeccionId] : null;

  // Las fotos y firmas locales se muestran con URLs temporales del Blob.
  const urlDeBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    urlsCreadasRef.current.push(url);
    return url;
  };
  useEffect(() => () => urlsCreadasRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const marcarGuardado = () => {
    setGuardadoEn(new Date());
    setErrorGuardado(null);
  };

  // Vuelca la copia local al formulario (y pide URLs firmadas para lo que solo está en el servidor).
  const hidratar = (rec) => {
    generalesRef.current = rec.generales;
    setGenerales(rec.generales);
    setRespuestas(Object.fromEntries(Object.entries(rec.respuestas).map(([codigo, r]) => [codigo, r.valor])));
    setHallazgos(rec.hallazgos.map(armarHallazgo));
    setNombreResponsable(rec.firmas.responsable?.nombre || "");

    const nuevasFotos = {};
    const nuevasFirmas = {};
    const remotas = [];
    for (const [codigo, f] of Object.entries(rec.fotos)) {
      if (f.blob) nuevasFotos[codigo] = { url: urlDeBlob(f.blob) };
      else remotas.push({ tipo: "foto", clave: codigo, ruta: f.ruta });
    }
    for (const [rol, f] of Object.entries(rec.firmas)) {
      if (f.blob) nuevasFirmas[rol] = { nombre: f.nombre, url: urlDeBlob(f.blob) };
      else remotas.push({ tipo: "firma", clave: rol, ruta: f.ruta, nombre: f.nombre });
    }
    setFotos(nuevasFotos);
    setFirmas(nuevasFirmas);

    if (remotas.length && navigator.onLine) {
      urlsFirmadas(remotas.map((r) => r.ruta))
        .then((urls) => {
          setFotos((prev) => ({ ...prev, ...Object.fromEntries(remotas.filter((r) => r.tipo === "foto").map((r) => [r.clave, { url: urls[r.ruta] }])) }));
          setFirmas((prev) => ({ ...prev, ...Object.fromEntries(remotas.filter((r) => r.tipo === "firma").map((r) => [r.clave, { nombre: r.nombre, url: urls[r.ruta] }])) }));
        })
        .catch(() => {}); // sin conexión: quedan sin miniatura hasta la próxima vez
    }
  };

  // Abre la inspección: la existente (?id=…) o una nueva. Todo vive primero en el dispositivo.
  useEffect(() => {
    if (!persisteEnSupabase || !userId) return;
    let cancelado = false;
    let promesa;
    if (idParam) promesa = cargarInspeccion(idParam);
    else promesa = nuevaRef.current ??= nuevaInspeccion(userId);
    promesa
      .then((rec) => {
        if (cancelado) return;
        setInspeccionId(rec.id);
        hidratar(rec);
      })
      .catch((err) => !cancelado && setErrorGuardado(err.message || "No se pudo abrir la inspección"))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam, persisteEnSupabase, userId]);

  // Guarda Generales en el dispositivo (solo si el usuario los tocó). Devuelve true si salió bien.
  const volcarGenerales = async () => {
    clearTimeout(timerGeneralesRef.current);
    if (!persisteEnSupabase || !inspeccionId || !generalesSuciosRef.current) return true;
    generalesSuciosRef.current = false;
    try {
      await guardarGenerales(inspeccionId, generalesRef.current);
      marcarGuardado();
      return true;
    } catch (err) {
      generalesSuciosRef.current = true;
      setErrorGuardado(err.message);
      return false;
    }
  };
  const volcarGeneralesRef = useRef(volcarGenerales);
  volcarGeneralesRef.current = volcarGenerales;

  // Si se sale del formulario con un cambio sin volcar, se guarda igual.
  useEffect(() => () => void volcarGeneralesRef.current(), []);

  const cambiarGeneral = (campo, valor) => {
    const nuevo = { ...generalesRef.current, [campo]: valor };
    generalesRef.current = nuevo;
    generalesSuciosRef.current = true;
    setGenerales(nuevo);
    clearTimeout(timerGeneralesRef.current);
    timerGeneralesRef.current = setTimeout(() => volcarGeneralesRef.current(), 400);
  };

  if (!modulo || (isNested && !sub)) return <Navigate to="/" replace />;

  const backTo = isNested ? `/modulos/${moduloId}` : "/";
  const title = sub ? sub.title : modulo.title;

  const responderChecklist = (item, valor) => {
    setRespuestas((r) => ({ ...r, [item.codigo]: valor }));
    if (!persisteEnSupabase || !inspeccionId) return;
    guardarRespuesta(inspeccionId, item, valor)
      .then(marcarGuardado)
      .catch((err) => setErrorGuardado(err.message));
  };

  const urlsFotos = Object.fromEntries(Object.entries(fotos).map(([c, f]) => [c, f.url]));
  const noCumple = Object.values(respuestas).filter((v) => v === "no").length;
  const contestadas = Object.keys(respuestas).length;

  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${checklist.length}`, color: "var(--violet-700)" },
    { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
    { label: "Fotos adjuntas", value: String(Object.keys(fotos).length), color: "var(--ink)" },
    {
      label: "Guardado",
      value: persisteEnSupabase ? textoGuardado({ error: errorGuardado, guardadoEn, sync }) : "no se guarda (solo en pantalla)",
      color: errorGuardado ? "var(--danger-fg)" : "var(--muted-4)",
    },
  ];

  const avance = Math.round((paso / 3) * 100);
  const esUltimo = paso === 3;

  const siguiente = async () => {
    if (!esUltimo) {
      setPaso((p) => Math.min(3, p + 1));
      return;
    }
    if (persisteEnSupabase) {
      const faltan = [!firmas.inspector && "del inspector", !firmas.responsable && "del responsable"].filter(Boolean);
      if (faltan.length) {
        setAvisoCierre(`Falta la firma ${faltan.join(" y ")}. Firmá y tocá "Guardar firma" antes de cerrar.`);
        return;
      }
      setAvisoCierre(null);
      setEnviando(true);
      try {
        if (!(await volcarGenerales())) return;
        await marcarEnviada(inspeccionId); // queda en el dispositivo y sube apenas haya conexión
      } catch (err) {
        setErrorGuardado(err.message);
        return;
      } finally {
        setEnviando(false);
      }
    }
    navigate(backTo);
  };

  const guardarBorrador = async () => {
    if (!(await volcarGenerales())) return;
    navigate(backTo);
  };

  // Devuelve false si no se pudo guardar (el recuadro conserva el trazo).
  const guardarFirma = async (rol, blob) => {
    const nombreFirmante = rol === "inspector" ? nombreInspector : nombreResponsable.trim();
    if (!nombreFirmante) {
      setAvisoCierre("Escribí el nombre del responsable antes de guardar su firma.");
      return false;
    }
    setAvisoCierre(null);
    setGuardandoFirma((g) => ({ ...g, [rol]: true }));
    try {
      if (persisteEnSupabase) {
        if (!inspeccionId) throw new Error("La inspección todavía no está lista");
        await guardarFirmaLocal(inspeccionId, rol, nombreFirmante, blob);
        marcarGuardado();
      }
      setFirmas((f) => ({ ...f, [rol]: { nombre: nombreFirmante, url: urlDeBlob(blob) } }));
      setErrorGuardado(null);
      return true;
    } catch (err) {
      setErrorGuardado(err.message);
      return false;
    } finally {
      setGuardandoFirma((g) => ({ ...g, [rol]: false }));
    }
  };

  // Si el responsable ya firmó y corrige su nombre, se actualiza también en la copia guardada.
  const guardarNombreResponsable = async () => {
    const nombreLimpio = nombreResponsable.trim();
    const actual = firmas.responsable;
    if (!actual || actual.nombre === nombreLimpio || !nombreLimpio) return;
    try {
      if (persisteEnSupabase) await cambiarNombreFirma(inspeccionId, "responsable", nombreLimpio);
      setFirmas((f) => ({ ...f, responsable: { ...f.responsable, nombre: nombreLimpio } }));
    } catch (err) {
      setErrorGuardado(err.message);
    }
  };

  const marcarSubiendo = (codigo, valor) => setSubiendoFoto((s) => ({ ...s, [codigo]: valor }));

  const subirFoto = async (item, file) => {
    if (!inspeccionId) return;
    marcarSubiendo(item.codigo, true);
    try {
      const blob = await comprimirImagen(file);
      await guardarFotoLocal(inspeccionId, item.codigo, blob);
      setFotos((f) => ({ ...f, [item.codigo]: { url: urlDeBlob(blob) } }));
      marcarGuardado();
    } catch (err) {
      setErrorGuardado(err.message);
    } finally {
      marcarSubiendo(item.codigo, false);
    }
  };

  const quitarFoto = async (item) => {
    if (!fotos[item.codigo]) return;
    marcarSubiendo(item.codigo, true);
    try {
      await quitarFotoLocal(inspeccionId, item.codigo);
      setFotos((f) => {
        const { [item.codigo]: _quitada, ...resto } = f;
        return resto;
      });
      marcarGuardado();
    } catch (err) {
      setErrorGuardado(err.message);
    } finally {
      marcarSubiendo(item.codigo, false);
    }
  };

  // Devuelve false si falló el guardado (el formulario de hallazgo conserva lo escrito).
  const agregarHallazgo = async (datos) => {
    if (!persisteEnSupabase) {
      setHallazgos((list) => [...list, armarHallazgo(datos)]);
      return true;
    }
    if (!inspeccionId) return false;
    try {
      const guardado = await agregarHallazgoLocal(inspeccionId, datos);
      setHallazgos((list) => [...list, armarHallazgo(guardado)]);
      marcarGuardado();
      return true;
    } catch (err) {
      setErrorGuardado(err.message);
      return false;
    }
  };

  const eliminarHallazgo = async (h) => {
    if (persisteEnSupabase && h.id) {
      try {
        await borrarHallazgoLocal(inspeccionId, h.id);
        marcarGuardado();
      } catch (err) {
        setErrorGuardado(err.message);
        return;
      }
    }
    setHallazgos((list) => list.filter((x) => x !== h));
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
      {cargando ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, color: "var(--muted)" }}>Cargando inspección…</div>
      ) : null}
      {errorGuardado ? (
        <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          Error al guardar: {errorGuardado}
        </div>
      ) : null}
      {persisteEnSupabase && errorEnvio ? (
        <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          No se pudo enviar al servidor: {errorEnvio}. Está guardado en el dispositivo y se reintenta solo.
        </div>
      ) : null}
      {persisteEnSupabase && !sync.online ? (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          Sin conexión: lo que cargues se guarda en el dispositivo y se envía solo cuando vuelva internet.
        </div>
      ) : null}
      {avisoCierre ? (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{avisoCierre}</div>
      ) : null}
      {!persisteEnSupabase ? (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          Este módulo todavía no guarda datos: lo que cargues se pierde al salir.
        </div>
      ) : null}
      <div style={{ background: "#fff", borderRadius: 22, padding: 14, marginBottom: 12, boxShadow: "var(--shadow-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <span className="heading" style={{ fontWeight: 700, fontSize: 14 }}>
            Paso {paso + 1} de 4 · {PASOS[paso]}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{avance}%</span>
        </div>
        <div style={{ height: 9, background: "var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 11 }}>
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
                background: p.on ? "var(--active-bg)" : p.done ? "var(--violet-150)" : "var(--violet-50)",
                color: p.on ? "var(--on-active)" : p.done ? "var(--violet-800)" : "var(--muted)",
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
          <PasoGenerales valores={generales} onCambiar={cambiarGeneral} />
        ) : null}
        {paso === 1 ? <PasoChecklist
            items={checklist}
            respuestas={respuestas}
            onResponder={responderChecklist}
            fotos={urlsFotos}
            subiendo={subiendoFoto}
            puedeFotos={persisteEnSupabase && Boolean(inspeccionId) && !cargando}
            onFoto={subirFoto}
            onQuitarFoto={quitarFoto}
          /> : null}
        {paso === 2 ? <PasoHallazgos hallazgos={hallazgos} onAgregar={agregarHallazgo} onEliminar={eliminarHallazgo} /> : null}
        {paso === 3 ? (
          <PasoCierre resumen={resumen} titulo={title} generales={generales} checklist={checklist} respuestas={respuestas} hallazgos={hallazgos}
            fotos={urlsFotos}
            firmas={firmas}
            nombreInspector={nombreInspector}
            nombreResponsable={nombreResponsable}
            onNombreResponsable={setNombreResponsable}
            onNombreResponsableBlur={guardarNombreResponsable}
            onGuardarFirma={guardarFirma}
            guardandoFirma={guardandoFirma}
          />
        ) : null}
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
            disabled={enviando}
            style={{
              flex: 1,
              border: 0,
              background: "var(--cta-gradient)",
              color: "var(--on-cta)",
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
