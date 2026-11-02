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
  editarHallazgo as editarHallazgoLocal,
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
import Icon from "../../components/Icon.jsx";
import Button from "../../components/ui/Button.jsx";
import Banner from "../../components/ui/Banner.jsx";
import { toast } from "../../components/ui/Toast.jsx";

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
    { label: "Ítems respondidos", value: `${contestadas} / ${totalItems}`, color: "var(--accent-text)" },
    // La TOP no cuenta desvíos ni lleva hallazgos ni fotos (la tarjeta de papel no los tiene).
    ...(esTop
      ? []
      : [
          { label: "Cumple parcialmente", value: String(cumpleParcial), color: cumpleParcial ? "var(--warn-fg)" : "var(--success-fg)" },
          { label: "No cumple", value: String(noCumple), color: noCumple ? "var(--danger-fg)" : "var(--success-fg)" },
          { label: "Hallazgos cargados", value: String(hallazgos.length), color: hallazgos.length ? "var(--warn-fg)" : "var(--text-primary)" },
          { label: "Fotos adjuntas", value: String(fotos.length), color: "var(--text-primary)" },
        ]),
    {
      label: "Guardado",
      value: persisteEnSupabase ? textoGuardado({ error: errorGuardado, guardadoEn, sync }) : "no se guarda (solo en pantalla)",
      color: errorGuardado ? "var(--danger-fg)" : "var(--text-secondary)",
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
        await confirmarBorrados(); // un borrado con "Deshacer" pendiente se aplica antes de enviar
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
    await confirmarBorrados();
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

  // Borrar con "Deshacer": desaparece al toque y se borra de verdad (en el dispositivo y en la
  // cola de envío) recién cuando se va el aviso. Si mientras tanto se sale del formulario, se
  // guarda como borrador o se envía, el borrado se confirma en ese momento (confirmarBorrados).
  // Si la app se cierra en esos segundos, no se borra: es lo seguro.
  const borradosRef = useRef(new Map()); // clave -> () => Promise (confirma el borrado)
  const borrarConDeshacer = ({ clave, titulo, descripcion, sacar, devolver, borrar }) => {
    sacar();
    let deshecho = false;
    const confirmarBorrado = () => {
      if (deshecho || !borradosRef.current.has(clave)) return Promise.resolve();
      borradosRef.current.delete(clave);
      return borrar().catch((err) => {
        devolver(); // no se pudo borrar: vuelve a la lista y se ve el error arriba
        setErrorGuardado(err.message);
      });
    };
    borradosRef.current.set(clave, confirmarBorrado);
    toast.success(titulo, {
      id: `borrar-${clave}`,
      descripcion,
      accion: {
        label: "Deshacer",
        onClick: () => {
          deshecho = true;
          borradosRef.current.delete(clave);
          devolver();
        },
      },
      onCerrar: confirmarBorrado,
    });
  };
  // Aplica los pendientes y saca sus avisos (un "Deshacer" que ya no deshace confundiría).
  const confirmarBorrados = () =>
    Promise.all(
      [...borradosRef.current.entries()].map(([clave, confirmarBorrado]) => {
        const hecho = confirmarBorrado();
        toast.dismiss(`borrar-${clave}`);
        return hecho;
      })
    );
  const confirmarBorradosRef = useRef(confirmarBorrados);
  confirmarBorradosRef.current = confirmarBorrados;
  useEffect(() => () => void confirmarBorradosRef.current(), []);

  // Vuelve a poner el elemento en el lugar donde estaba.
  const reinsertar = (lista, elemento, indice) => (lista.includes(elemento) ? lista : [...lista.slice(0, indice), elemento, ...lista.slice(indice)]);

  const quitarFoto = (foto) => {
    const indice = fotos.indexOf(foto);
    borrarConDeshacer({
      clave: `foto-${foto.id}`,
      titulo: "Foto quitada",
      sacar: () => setFotos((f) => f.filter((x) => x.id !== foto.id)),
      devolver: () => setFotos((f) => reinsertar(f, foto, indice)),
      borrar: async () => {
        if (!persisteEnSupabase) return;
        await quitarFotoLocal(inspeccionId, userId, foto.id);
        marcarGuardado();
      },
    });
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

  // Corrige un hallazgo ya cargado. Igual que agregar: false si falló (se conserva lo escrito).
  const editarHallazgo = async (h, datos) => {
    if (!persisteEnSupabase || !h.id) {
      setHallazgos((list) => list.map((x) => (x === h ? armarHallazgo({ ...datos, id: h.id }) : x)));
      return true;
    }
    if (!inspeccionId) return false;
    try {
      const guardado = await editarHallazgoLocal(inspeccionId, userId, h.id, { ...datos, correo: correoDe(colaboradores, datos.responsable) });
      setHallazgos((list) => list.map((x) => (x.id === h.id ? armarHallazgo(guardado) : x)));
      marcarGuardado();
      return true;
    } catch (err) {
      setErrorGuardado(err.message);
      return false;
    }
  };

  const eliminarHallazgo = (h) => {
    const indice = hallazgos.indexOf(h);
    borrarConDeshacer({
      clave: `hallazgo-${h.id ?? `${h.titulo}-${Date.now()}`}`,
      titulo: "Hallazgo eliminado",
      descripcion: h.titulo,
      sacar: () => setHallazgos((list) => list.filter((x) => x !== h)),
      devolver: () => setHallazgos((list) => reinsertar(list, h, indice)),
      borrar: async () => {
        if (!persisteEnSupabase || !h.id) return;
        await borrarHallazgoLocal(inspeccionId, userId, h.id);
        marcarGuardado();
      },
    });
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

  // Borrador / Siguiente: fijos abajo, justo arriba de la navegación (ver AppShell).
  const barraAcciones =
    !soloLectura || (mostrarSiguiente && !(soloLectura && esUltimo)) ? (
      <>
        {!soloLectura ? (
          <Button variant="surface" size="lg" onClick={guardarBorrador}>
            Borrador
          </Button>
        ) : null}
        {mostrarSiguiente && !(soloLectura && esUltimo) ? (
          <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={siguiente} loading={enviando} iconEnd={esUltimo ? undefined : "arrowRight"}>
            {esUltimo ? "Cerrar y enviar" : "Siguiente"}
          </Button>
        ) : null}
      </>
    ) : null;

  return (
    <AppShell title={title} subtitle="Formulario en 4 pasos" onBack={() => navigate(backTo)} barraAcciones={barraAcciones}>
      {/* Estado de la pantalla: avisos en línea que quedan mientras dure la situación. */}
      <div className="app-stack" style={{ marginBottom: "var(--space-3)" }}>
        {cargando ? (
          <div role="status">
            <Banner tono="neutral" icono="refresh">
              Cargando inspección…
            </Banner>
          </div>
        ) : null}
        {soloLectura ? (
          <Banner tono="warning" icono="eye" titulo="Solo lectura">
            {datosInsp.estado === "enviado" ? "Esta inspección ya fue enviada y solo un administrador puede corregirla." : "No podés modificar esta inspección."}
          </Banner>
        ) : null}
        {errorGuardado ? (
          <Banner tono="danger" alerta titulo="Error al guardar">
            {errorGuardado}
          </Banner>
        ) : null}
        {persisteEnSupabase && errorEnvio ? (
          <Banner tono="danger" titulo="No se pudo enviar al servidor">
            {errorEnvio}. Está guardado en el dispositivo y se reintenta solo.
          </Banner>
        ) : null}
        {persisteEnSupabase && !sync.online ? (
          <Banner tono="warning" icono="cloudOff" titulo="Sin conexión">
            Lo que cargues se guarda en el dispositivo y se envía solo cuando vuelva internet.
          </Banner>
        ) : null}
        {avisoCierre ? (
          <Banner tono="warning" alerta>
            {avisoCierre}
          </Banner>
        ) : null}
        {avisarDetalle && sinDetalle.length ? (
          <Banner
            tono="warning"
            alerta
            accion={
              <Button variant="warning" size="sm" onClick={() => irAlItem(sinDetalle[0].codigo)}>
                {sinDetalle[0].otros ? "Ir a “Otros”" : `Ir al ítem ${sinDetalle[0].codigo}`}
              </Button>
            }
          >
            {avisoSinDetalle()}
          </Banner>
        ) : null}
        {!persisteEnSupabase ? (
          <Banner tono="warning" titulo="No se guarda">
            Sin conexión con el servidor configurada: lo que cargues se pierde al salir.
          </Banner>
        ) : null}
      </div>

      <div className="form-layout">
      <section className="panel panel--compacto form-layout__pasos" aria-label="Pasos">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
          <h2 className="t-headline" style={{ fontSize: "var(--text-callout)" }}>
            Paso {paso + 1} de 4 · {PASOS[paso]}
          </h2>
          <span className="t-footnote tabular" style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
            {contestadas}/{totalItems} ítems
          </span>
        </div>
        {/* Lo que mide la barra es el checklist respondido (ver `avance`). */}
        <div
          role="progressbar"
          aria-label="Checklist respondido"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={avance}
          style={{ height: 8, background: "var(--accent-soft)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: "var(--space-3)" }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "var(--radius-full)",
              background: "var(--brand-gradient)",
              transition: "width .45s var(--ease-out)",
              width: `${avance}%`,
            }}
          />
        </div>
        {/* En el celular los 4 pasos van en 4 columnas iguales con el número arriba del nombre
            (en fila no entraban en 360 px); desde 1280 px, en columna al costado. Ver .paso-btn. */}
        <ol className="form-pasos__lista">
          {pasos.map((p) => (
            <li key={p.label} style={{ minWidth: 0 }}>
              <button
                type="button"
                onClick={() => setPaso(p.n - 1)}
                aria-current={p.on ? "step" : undefined}
                data-hecho={p.done || undefined}
                className="paso-btn"
              >
                <span className="paso-btn__numero">{p.done && !p.on ? <Icon name="check" size={14} /> : `${p.n}${celular ? "" : "."}`}</span>
                <span className="truncate" style={{ maxWidth: "100%" }}>
                  {p.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="app-screen panel" style={{ boxShadow: "var(--shadow-2)", padding: celular ? "var(--space-3)" : undefined }}>
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
        {paso === 2 && !esTop ? <PasoHallazgos hallazgos={hallazgos} onAgregar={agregarHallazgo} onEditar={editarHallazgo} onEliminar={eliminarHallazgo} colaboradores={colaboradores} /> : null}
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
      </div>
      {dialogo}
    </AppShell>
  );
}
