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
import { BUCKET_FIRMAS, BUCKET_FOTOS, MAX_FOTOS, comprimirImagen, urlsFirmadas } from "../../lib/fotos.js";
import {
  agregarHallazgo as agregarHallazgoLocal,
  borrarHallazgo as borrarHallazgoLocal,
  cambiarNombreFirma,
  cargarInspeccion,
  guardarFirma as guardarFirmaLocal,
  agregarFoto as agregarFotoLocal,
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
  // Todos los módulos guardan (en el dispositivo primero, y de ahí a Supabase); ver lib/sync.js.
  const persisteEnSupabase = Boolean(modulo) && supabaseConfigured;

  const [paso, setPaso] = useState(0);
  const [generales, setGenerales] = useState(GENERALES_INICIALES);
  const [respuestas, setRespuestas] = useState({});
  const [hallazgos, setHallazgos] = useState([]);
  const [inspeccionId, setInspeccionId] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [fotos, setFotos] = useState([]); // fotos generales: { id, url }
  const [subiendoFotos, setSubiendoFotos] = useState(0);
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

    const galeria = rec.galeria ?? [];
    const nuevasFirmas = {};
    const firmasRemotas = [];
    for (const [rol, f] of Object.entries(rec.firmas)) {
      if (f.blob) nuevasFirmas[rol] = { nombre: f.nombre, url: urlDeBlob(f.blob) };
      else firmasRemotas.push({ rol, ruta: f.ruta, nombre: f.nombre });
    }
    setFotos(galeria.map((f) => ({ id: f.id, url: f.blob ? urlDeBlob(f.blob) : null })));
    setFirmas(nuevasFirmas);

    // Lo que solo está en el servidor necesita URL firmada (requiere conexión).
    const fotosRemotas = galeria.filter((f) => !f.blob);
    if (fotosRemotas.length && navigator.onLine) {
      urlsFirmadas(fotosRemotas.map((f) => f.ruta), BUCKET_FOTOS)
        .then((urls) => {
          const rutaDe = Object.fromEntries(fotosRemotas.map((f) => [f.id, f.ruta]));
          setFotos((prev) => prev.map((p) => (p.url ? p : { ...p, url: urls[rutaDe[p.id]] || null })));
        })
        .catch(() => {}); // sin conexión: quedan sin miniatura hasta la próxima vez
    }
    if (firmasRemotas.length && navigator.onLine) {
      urlsFirmadas(firmasRemotas.map((f) => f.ruta), BUCKET_FIRMAS)
        .then((urls) => setFirmas((prev) => ({ ...prev, ...Object.fromEntries(firmasRemotas.map((f) => [f.rol, { nombre: f.nombre, url: urls[f.ruta] }])) })))
        .catch(() => {});
    }
  };

  // Abre la inspección: la existente (?id=…) o una nueva. Todo vive primero en el dispositivo.
  useEffect(() => {
    if (!persisteEnSupabase || !userId) return;
    let cancelado = false;
    let promesa;
    if (idParam) promesa = cargarInspeccion(idParam, moduloId);
    else promesa = nuevaRef.current ??= nuevaInspeccion(userId, moduloId, isNested ? subId : null);
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
  }, [idParam, persisteEnSupabase, userId, moduloId, subId]);

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

  const noCumple = Object.values(respuestas).filter((v) => v === "no").length;
  const contestadas = Object.keys(respuestas).length;

  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${checklist.length}`, color: "var(--violet-700)" },
    { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
    { label: "Fotos adjuntas", value: String(fotos.length), color: "var(--ink)" },
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

  // Fotos generales de la inspección (se adjuntan en el Paso 4, hasta MAX_FOTOS).
  const agregarFotos = async (archivos) => {
    if (persisteEnSupabase && !inspeccionId) return;
    const lista = [...archivos].slice(0, Math.max(0, MAX_FOTOS - fotos.length));
    if (!lista.length) return;
    setSubiendoFotos((n) => n + lista.length);
    for (const archivo of lista) {
      try {
        const blob = await comprimirImagen(archivo);
        let id = crypto.randomUUID();
        if (persisteEnSupabase) {
          id = (await agregarFotoLocal(inspeccionId, blob)).id;
          marcarGuardado();
        }
        setFotos((f) => [...f, { id, url: urlDeBlob(blob) }]);
      } catch (err) {
        setErrorGuardado(err.message);
      } finally {
        setSubiendoFotos((n) => n - 1);
      }
    }
  };

  const quitarFoto = async (foto) => {
    try {
      if (persisteEnSupabase) {
        await quitarFotoLocal(inspeccionId, foto.id);
        marcarGuardado();
      }
      setFotos((f) => f.filter((x) => x.id !== foto.id));
    } catch (err) {
      setErrorGuardado(err.message);
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
          Sin conexión con el servidor configurada: lo que cargues se pierde al salir.
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
          /> : null}
        {paso === 2 ? <PasoHallazgos hallazgos={hallazgos} onAgregar={agregarHallazgo} onEliminar={eliminarHallazgo} /> : null}
        {paso === 3 ? (
          <PasoCierre resumen={resumen} titulo={title} generales={generales} checklist={checklist} respuestas={respuestas} hallazgos={hallazgos}
            fotos={fotos}
            subiendoFotos={subiendoFotos}
            onAgregarFotos={agregarFotos}
            onQuitarFoto={quitarFoto}
            maxFotos={MAX_FOTOS}
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
