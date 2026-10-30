import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { findModulo, findSub, pasosDe, rutaVolver } from "../../data/modulos.js";
import PasoGenerales from "./PasoGenerales.jsx";
import PasoChecklist from "./PasoChecklist.jsx";
import PasoHallazgos from "./PasoHallazgos.jsx";
import PasoCierre from "./PasoCierre.jsx";
import { TopDatos, TopDetalle, TopObservacion } from "./PasoTop.jsx";
import { getChecklist } from "../../data/checklist.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabaseConfigured } from "../../lib/supabaseClient.js";
import { armarHallazgo } from "../../data/severidades.js";
import { BUCKET_FIRMAS, BUCKET_FOTOS, MAX_FOTOS, comprimirImagen, urlsFirmadas } from "../../lib/fotos.js";
import { uuid } from "../../lib/uuid.js";
import {
  agregarHallazgo as agregarHallazgoLocal,
  borrarHallazgo as borrarHallazgoLocal,
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
import { useCelular } from "../../lib/useCelular.js";
import { correoDe, useColaboradores } from "../../lib/colaboradores.js";
import { useConfirmacion } from "../../components/Confirmacion.jsx";

const GENERALES_INICIALES = { cliente: "", ubicacion: "", grupoAuditado: "", fechaHora: "", tareaObservada: "" };
// Campos de la Tarjeta TOP que no están en Generales (columna `datos` de la cabecera). Detalle
// observación va en tareaObservada y Área de trabajo en ubicacion.
const DATOS_TOP = { observador: "", funcion: "", accionInmediata: "", accionReiteracion: "" };

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
  const { userId, nombre: nombreInspector, puede, rolListo } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get("id"); // retomar una inspección existente
  const sync = useSync();
  const colaboradores = useColaboradores();
  const celular = useCelular();
  const [confirmar, dialogo] = useConfirmacion();

  const modulo = findModulo(moduloId);
  const sub = isNested ? findSub(moduloId, subId) : null;
  const checklist = useMemo(() => getChecklist(moduloId, subId), [moduloId, subId]);
  const esTop = moduloId === "top";
  const PASOS = pasosDe(moduloId);
  // Todos los módulos guardan (en el dispositivo primero, y de ahí a Supabase); ver lib/sync.js.
  const persisteEnSupabase = Boolean(modulo) && supabaseConfigured;

  const [paso, setPaso] = useState(0);
  const [generales, setGenerales] = useState(GENERALES_INICIALES);
  const [respuestas, setRespuestas] = useState({});
  const [comentarios, setComentarios] = useState({}); // codigo -> detalle (obligatorio si la respuesta es "Cumple parcialmente")
  const [hallazgos, setHallazgos] = useState([]);
  const [inspeccionId, setInspeccionId] = useState(null);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [fotos, setFotos] = useState([]); // fotos generales: { id, url }
  const [subiendoFotos, setSubiendoFotos] = useState(0);
  const [errorFotos, setErrorFotos] = useState(null); // archivos que no se pudieron leer como imagen
  const [firmas, setFirmas] = useState({}); // rol -> { nombre, url }
  const [guardandoFirma, setGuardandoFirma] = useState({});
  const [avisoCierre, setAvisoCierre] = useState(null);
  const [avisarDetalle, setAvisarDetalle] = useState(false); // "Falta el detalle…" (se arma con lo que falta ahora)
  const [irAItem, setIrAItem] = useState(null); // { codigo } para PasoChecklist
  const [checklistUltimaPagina, setChecklistUltimaPagina] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(persisteEnSupabase);
  const [datosInsp, setDatosInsp] = useState({ estado: "borrador", inspectorId: null }); // de quién es y si ya se envió

  const nuevaRef = useRef(null); // promesa de la inspección nueva (evita crearla dos veces con StrictMode)
  const generalesRef = useRef(GENERALES_INICIALES);
  const generalesSuciosRef = useRef(false);
  const timerGeneralesRef = useRef(null);
  const urlsCreadasRef = useRef([]);
  const borradoresFirmaRef = useRef({}); // rol -> trazo sin guardar (dataURL), para no perderlo al cambiar de paso

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
    setDatosInsp({ estado: rec.estado, inspectorId: rec.inspectorId ?? null });
    const g = esTop ? { ...rec.generales, datos: { ...DATOS_TOP, ...rec.generales.datos } } : rec.generales;
    generalesRef.current = g;
    setGenerales(g);
    setRespuestas(Object.fromEntries(Object.entries(rec.respuestas).map(([codigo, r]) => [codigo, r.valor])));
    setComentarios(Object.fromEntries(Object.entries(rec.respuestas).filter(([, r]) => r.comentario).map(([codigo, r]) => [codigo, r.comentario])));
    setHallazgos(rec.hallazgos.map(armarHallazgo));

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
    if (!persisteEnSupabase || !userId || !rolListo) return;
    if (idParam && idParam === inspeccionId) return; // ya abierta: solo se le agregó el ?id= a la URL (ver abajo)
    // 'Solo lectura' no crea inspecciones nuevas (la base tampoco lo deja).
    if (!idParam && !puede("crearInspecciones")) {
      navigate("/", { replace: true });
      return;
    }
    let cancelado = false;
    let promesa;
    if (idParam) promesa = cargarInspeccion(idParam, moduloId);
    // La TOP arranca con el nombre de quien la completa (se puede cambiar: puede pasar una tarjeta de papel de otra persona).
    else promesa = nuevaRef.current ??= nuevaInspeccion(userId, moduloId, isNested ? subId : null, esTop ? { datos: { ...DATOS_TOP, observador: nombreInspector || "" } } : {});
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
  }, [idParam, persisteEnSupabase, userId, rolListo, moduloId, subId]);

  // Una inspección nueva pasa a tener su ?id= en la URL: si se recarga la página (o el
  // celular vuelve a abrir la pestaña) se retoma la misma en vez de empezar otra vacía.
  useEffect(() => {
    if (inspeccionId && !idParam) setSearchParams({ id: inspeccionId }, { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspeccionId, idParam]);

  // Guarda Generales en el dispositivo (solo si el usuario los tocó). Devuelve true si salió bien.
  const volcarGenerales = async () => {
    clearTimeout(timerGeneralesRef.current);
    if (!persisteEnSupabase || !inspeccionId || !generalesSuciosRef.current) return true;
    generalesSuciosRef.current = false;
    try {
      await guardarGenerales(inspeccionId, userId, generalesRef.current);
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
  const cambiarDato = (campo, valor) => cambiarGeneral("datos", { ...generalesRef.current.datos, [campo]: valor });

  // Llevan texto además de la respuesta: "Cumple parcialmente" (el detalle) y los "Otros" de la TOP.
  const conDetalle = (codigo, valor) => valor === "parcial" || Boolean(checklist.find((i) => i.codigo === codigo)?.otros);

  const guardarRespuestaConDetalle = (item, valor, detalle) =>
    guardarRespuesta(inspeccionId, userId, item, valor, detalle)
      .then(marcarGuardado)
      .catch((err) => setErrorGuardado(err.message));

  // Los detalles se guardan 500 ms después de dejar de escribir (o al salir del campo). Un "Otros"
  // todavía sin marcar no tiene respuesta donde guardarse: se guarda junto con la marca.
  const detallesPendientes = useRef({}); // codigo -> { item, texto, timer }
  const volcarDetalles = () => {
    for (const [codigo, p] of Object.entries(detallesPendientes.current)) {
      clearTimeout(p.timer);
      delete detallesPendientes.current[codigo];
      if (persisteEnSupabase && inspeccionId && respuestas[codigo]) guardarRespuestaConDetalle(p.item, respuestas[codigo], p.texto);
    }
  };
  const volcarDetallesRef = useRef(volcarDetalles);
  volcarDetallesRef.current = volcarDetalles;
  useEffect(() => () => volcarDetallesRef.current(), []);

  if (!modulo || (isNested && !sub)) return <Navigate to="/" replace />;

  // Se vuelve a donde se abrió (Registros, el panel) o, si no, al menú del módulo.
  const backTo = location.state?.volverA || (isNested ? `/modulos/${moduloId}` : rutaVolver(moduloId));
  const title = sub ? sub.title : modulo.title;

  const responderChecklist = (item, valor) => {
    // Cambiar a otra respuesta descarta el detalle: solo "Cumple parcialmente" (y "Otros") lo lleva.
    const detalle = conDetalle(item.codigo, valor) ? comentarios[item.codigo] || "" : "";
    clearTimeout(detallesPendientes.current[item.codigo]?.timer);
    delete detallesPendientes.current[item.codigo];
    setRespuestas((r) => ({ ...r, [item.codigo]: valor }));
    if (!conDetalle(item.codigo, valor)) setComentarios(({ [item.codigo]: _quitado, ...resto }) => resto);
    if (!persisteEnSupabase || !inspeccionId) return;
    guardarRespuestaConDetalle(item, valor, detalle);
  };

  const comentarChecklist = (item, texto) => {
    setComentarios((c) => ({ ...c, [item.codigo]: texto }));
    if (!persisteEnSupabase || !inspeccionId) return;
    clearTimeout(detallesPendientes.current[item.codigo]?.timer);
    const timer = setTimeout(() => volcarDetallesRef.current(), 500);
    detallesPendientes.current[item.codigo] = { item, texto, timer };
  };

  // Ítems "Cumple parcialmente" sin detalle, y "Otros" de la TOP marcados SI/NO sin decir qué (o
  // escritos sin marcar): no se puede avanzar ni cerrar con ellos.
  const sinDetalle = checklist.filter((i) => {
    const valor = respuestas[i.codigo];
    const texto = comentarios[i.codigo]?.trim();
    if (i.otros) return valor ? valor !== "na" && !texto : Boolean(texto);
    return valor === "parcial" && !texto;
  });
  const avisoSinDetalle = () => {
    const [primero] = sinDetalle;
    if (primero.otros) return `"Otros" de ${primero.categoria}: ${respuestas[primero.codigo] ? "escribí qué se observó" : "marcá SI, NO o N/A"}.`;
    return `Falta el detalle en ${sinDetalle.length === 1 ? "el ítem" : "los ítems"} ${sinDetalle.map((i) => i.codigo).join(", ")} ("Cumple parcialmente").`;
  };
  const irAlItem = (codigo) => {
    setPaso(1);
    setIrAItem({ codigo });
  };

  const noCumple = Object.values(respuestas).filter((v) => v === "no").length;
  const cumpleParcial = Object.values(respuestas).filter((v) => v === "parcial").length;
  const contestadas = checklist.filter((i) => respuestas[i.codigo] != null).length;
  // Los "Otros" de la TOP son optativos: cuentan solo si se marcaron.
  const totalItems = checklist.filter((i) => !i.otros || respuestas[i.codigo] != null).length;

  const resumen = [
    { label: "Ítems respondidos", value: `${contestadas} / ${totalItems}`, color: "var(--violet-700)" },
    // La TOP no cuenta desvíos ni lleva hallazgos ni fotos (la tarjeta de papel no los tiene).
    ...(esTop
      ? []
      : [
          { label: "Cumple parcialmente", value: String(cumpleParcial), color: cumpleParcial ? "var(--warn-fg)" : "var(--success-fg)" },
          { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
          { label: "Hallazgos cargados", value: String(hallazgos.length), color: hallazgos.length ? "var(--warn-fg)" : "var(--ink)" },
          { label: "Fotos adjuntas", value: String(fotos.length), color: "var(--ink)" },
        ]),
    {
      label: "Guardado",
      value: persisteEnSupabase ? textoGuardado({ error: errorGuardado, guardadoEn, sync }) : "no se guarda (solo en pantalla)",
      color: errorGuardado ? "var(--danger-fg)" : "var(--muted-4)",
      soloPantalla: true, // estado de la app, no va en el PDF
    },
  ];

  // Se puede mirar pero no tocar: inspección de otra persona (si no sos administrador),
  // inspección ya enviada (solo el administrador la corrige) o rol de solo lectura.
  const soloLectura =
    persisteEnSupabase &&
    Boolean(idParam) &&
    !cargando &&
    !puede("editarEnviadas") &&
    (datosInsp.estado === "enviado" || (datosInsp.inspectorId && datosInsp.inspectorId !== userId) || !puede("crearInspecciones"));
  // Lo que mide la barra es el checklist respondido, no el paso (antes marcaba 100 % en Cierre con 3 de 35).
  const avance = totalItems ? Math.round((contestadas / totalItems) * 100) : 0;
  const esUltimo = paso === 3;
  // En el paso Checklist, "Siguiente" recién aparece al llegar a la última categoría (la TOP va en una sola página).
  const mostrarSiguiente = paso !== 1 || esTop || checklistUltimaPagina;

  const siguiente = async () => {
    volcarDetalles();
    if (sinDetalle.length && (esUltimo || paso === 1)) {
      setAvisarDetalle(true);
      irAlItem(sinDetalle[0].codigo);
      return;
    }
    setAvisoCierre(null);
    if (!esUltimo) {
      setPaso((p) => Math.min(3, p + 1));
      return;
    }
    if (persisteEnSupabase) {
      if (!firmas.inspector) {
        setAvisoCierre('Falta la firma del inspector. Firmá y tocá "Guardar firma" antes de cerrar.');
        return;
      }
      setAvisoCierre(null);
      const yaEnviada = datosInsp.estado === "enviado"; // el administrador corrigiendo una enviada
      const ok = await confirmar(
        yaEnviada
          ? { titulo: "¿Guardar la corrección?", mensaje: "La inspección ya estaba enviada: queda con estos cambios.", aceptar: "Guardar", peligro: false }
          : {
              titulo: "¿Cerrar y enviar la inspección?",
              mensaje: "Después ya no se puede modificar: solo un administrador puede corregirla.",
              aceptar: "Cerrar y enviar",
              peligro: false,
            }
      );
      if (!ok) return;
      setEnviando(true);
      try {
        if (!(await volcarGenerales())) return;
        await marcarEnviada(inspeccionId, userId); // queda en el dispositivo y sube apenas haya conexión
      } catch (err) {
        setErrorGuardado(err.message);
        return;
      } finally {
        setEnviando(false);
      }
      // Se muestra en la pantalla a la que se vuelve (ver AppShell).
      const aviso = yaEnviada
        ? "Corrección guardada."
        : sync.online
          ? "Inspección enviada."
          : "Inspección cerrada: se envía sola cuando vuelva la conexión.";
      navigate(backTo, { state: { aviso } });
      return;
    }
    navigate(backTo);
  };

  const guardarBorrador = async () => {
    volcarDetalles();
    if (!(await volcarGenerales())) return;
    navigate(backTo);
  };

  // Devuelve false si no se pudo guardar (el recuadro conserva el trazo).
  const guardarFirma = async (rol, blob) => {
    const nombreFirmante = nombreInspector;
    setAvisoCierre(null);
    setGuardandoFirma((g) => ({ ...g, [rol]: true }));
    try {
      if (persisteEnSupabase) {
        if (!inspeccionId) throw new Error("La inspección todavía no está lista");
        await guardarFirmaLocal(inspeccionId, userId, rol, nombreFirmante, blob, "");
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

  // El trazo de una firma sin guardar se conserva al salir del paso Cierre (por ejemplo, cuando
  // "Cerrar y enviar" manda a completar un detalle del checklist) y vuelve al regresar.
  const cambiarBorradorFirma = (rol, dataUrl) => {
    if (dataUrl) borradoresFirmaRef.current[rol] = dataUrl;
    else delete borradoresFirmaRef.current[rol];
  };

  // Fotos generales de la inspección (se adjuntan en el Paso 4, hasta MAX_FOTOS).
  const agregarFotos = async (archivos) => {
    if (persisteEnSupabase && !inspeccionId) return;
    const lista = [...archivos].slice(0, Math.max(0, MAX_FOTOS - fotos.length));
    if (!lista.length) return;
    setErrorFotos(null);
    setSubiendoFotos((n) => n + lista.length);
    const ilegibles = [];
    for (const archivo of lista) {
      try {
        let blob;
        try {
          blob = await comprimirImagen(archivo);
        } catch {
          ilegibles.push(archivo.name); // no es una imagen: se avisa en la galería, no es un error de guardado
          continue;
        }
        let id = uuid();
        if (persisteEnSupabase) {
          id = (await agregarFotoLocal(inspeccionId, userId, blob)).id;
          marcarGuardado();
        }
        setFotos((f) => [...f, { id, url: urlDeBlob(blob) }]);
      } catch (err) {
        setErrorGuardado(err.message);
      } finally {
        setSubiendoFotos((n) => n - 1);
      }
    }
    if (ilegibles.length === 1) setErrorFotos(`No se pudo agregar "${ilegibles[0]}": no es una imagen que se pueda leer.`);
    else if (ilegibles.length) setErrorFotos(`No se pudieron agregar ${ilegibles.join(", ")}: no son imágenes que se puedan leer.`);
  };

  const quitarFoto = async (foto) => {
    try {
      if (persisteEnSupabase) {
        await quitarFotoLocal(inspeccionId, userId, foto.id);
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
      const guardado = await agregarHallazgoLocal(inspeccionId, userId, { ...datos, correo: correoDe(colaboradores, datos.responsable) });
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
        await borrarHallazgoLocal(inspeccionId, userId, h.id);
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
    [paso, PASOS]
  );

  return (
    <AppShell title={title} subtitle="Formulario en 4 pasos" onBack={() => navigate(backTo)} padBottom="200px">
      {soloLectura ? (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          Solo lectura: {datosInsp.estado === "enviado" ? "esta inspección ya fue enviada y solo un administrador puede corregirla." : "no podés modificar esta inspección."}
        </div>
      ) : null}
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
      {avisarDetalle && sinDetalle.length ? (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          <span style={{ flex: "1 1 220px" }}>{avisoSinDetalle()}</span>
          <button
            onClick={() => irAlItem(sinDetalle[0].codigo)}
            style={{ border: 0, background: "var(--warn-fg)", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 12px", borderRadius: 12, cursor: "pointer", minHeight: 38 }}
          >
            {sinDetalle[0].otros ? "Ir a “Otros”" : `Ir al ítem ${sinDetalle[0].codigo}`}
          </button>
        </div>
      ) : null}
      {!persisteEnSupabase ? (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          Sin conexión con el servidor configurada: lo que cargues se pierde al salir.
        </div>
      ) : null}
      <div style={{ background: "#fff", borderRadius: 22, padding: celular ? 12 : 14, marginBottom: 12, boxShadow: "var(--shadow-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <span className="heading" style={{ fontWeight: 700, fontSize: 14 }}>
            Paso {paso + 1} de 4 · {PASOS[paso]}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {contestadas}/{totalItems} ítems
          </span>
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
        {/* En el celular los 4 pasos van en 4 columnas iguales con el número arriba del nombre:
            en fila no entraban en 360 px y "4. Cierre" quedaba fuera de la pantalla. */}
        <div
          style={
            celular
              ? { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 5 }
              : { display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }
          }
        >
          {pasos.map((p) => (
            <button
              key={p.label}
              onClick={() => setPaso(p.n - 1)}
              aria-current={p.on ? "step" : undefined}
              style={{
                flex: "0 0 auto",
                minWidth: 0,
                border: 0,
                background: p.on ? "var(--active-bg)" : p.done ? "var(--violet-150)" : "var(--violet-50)",
                color: p.on ? "var(--on-active)" : p.done ? "var(--violet-800)" : "var(--muted)",
                borderRadius: celular ? 14 : 20,
                padding: celular ? "6px 2px" : "10px 15px",
                cursor: "pointer",
                minHeight: 44,
                fontSize: celular ? 11 : 12.5,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {celular ? (
                <>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{p.n}</span>
                  <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
                </>
              ) : (
                `${p.n}. ${p.label}`
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="app-screen" style={{ background: "#fff", borderRadius: 22, padding: celular ? 12 : 16, boxShadow: "0 12px 30px -24px rgba(36,18,70,.5)" }}>
        {/* fieldset disabled apaga todos los campos y botones de los pasos de una sola vez */}
        <fieldset disabled={soloLectura && paso !== 3} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {paso === 0 && esTop ? <TopDatos valores={generales} onCambiar={cambiarGeneral} onCambiarDato={cambiarDato} /> : null}
        {paso === 1 && esTop ? (
          <TopObservacion
            items={checklist}
            respuestas={respuestas}
            comentarios={comentarios}
            onResponder={responderChecklist}
            onComentar={comentarChecklist}
            onComentarioListo={volcarDetalles}
            irA={irAItem}
          />
        ) : null}
        {paso === 2 && esTop ? <TopDetalle valores={generales} onCambiar={cambiarGeneral} onCambiarDato={cambiarDato} /> : null}
        {paso === 0 && !esTop ? (
          <PasoGenerales valores={generales} onCambiar={cambiarGeneral} />
        ) : null}
        {paso === 1 && !esTop ? <PasoChecklist
            items={checklist}
            respuestas={respuestas}
            comentarios={comentarios}
            onResponder={responderChecklist}
            onComentar={comentarChecklist}
            onComentarioListo={volcarDetalles}
            onPaginaChange={setChecklistUltimaPagina}
            irA={irAItem}
          /> : null}
        {paso === 2 && !esTop ? <PasoHallazgos hallazgos={hallazgos} onAgregar={agregarHallazgo} onEliminar={eliminarHallazgo} colaboradores={colaboradores} /> : null}
        {paso === 3 ? (
          <PasoCierre resumen={resumen} titulo={title} generales={generales} checklist={checklist} respuestas={respuestas} comentarios={comentarios} hallazgos={hallazgos}
            {...(esTop && {
              formato: "top",
              conFotos: false,
              conHallazgos: false,
              conChecklist: false,
              secciones: [
                {
                  titulo: "Datos de quien completa la TOP",
                  filas: [
                    ["Apellido y nombre", generales.datos?.observador],
                    ["Función", generales.datos?.funcion],
                    ["Área de trabajo", generales.ubicacion],
                    ["Cliente / obra", generales.cliente],
                  ],
                },
                { titulo: "Detalle observación", texto: generales.tareaObservada },
                { titulo: "Acción inmediata", texto: generales.datos?.accionInmediata },
                { titulo: "Acción para evitar la reiteración", texto: generales.datos?.accionReiteracion },
              ],
            })}
            fotos={fotos}
            subiendoFotos={subiendoFotos}
            onAgregarFotos={agregarFotos}
            onQuitarFoto={quitarFoto}
            maxFotos={MAX_FOTOS}
            errorFotos={errorFotos}
            firmas={firmas}
            borradoresFirma={borradoresFirmaRef.current}
            onBorradorFirma={cambiarBorradorFirma}
            nombreInspector={nombreInspector}
            onGuardarFirma={guardarFirma}
            guardandoFirma={guardandoFirma}
            soloLectura={soloLectura}
          />
        ) : null}
        </fieldset>
      </div>

      {/* Justo arriba de la TabBar (78 px + el área segura de los celulares con barra de gestos). */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(78px + env(safe-area-inset-bottom))", padding: "0 14px", zIndex: 25, pointerEvents: "none" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", display: "flex", gap: 9, pointerEvents: "auto" }}>
          {!soloLectura ? <button
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
          </button> : null}
          {mostrarSiguiente && !(soloLectura && esUltimo) ? (
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
          ) : null}
        </div>
      </div>
      {dialogo}
    </AppShell>
  );
}
