import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon.jsx";
import { CONSULTA_CELULAR, useMediaQuery } from "../../lib/breakpoints.js";

/* =====================================================================================
   Toasts: avisos breves del resultado de una acción ("Inspección enviada", "No se pudo
   guardar"). No roban el foco. Uso (en cualquier componente, o fuera de React):

     const toast = useToast();            // o: import { toast } from ".../ui/Toast.jsx"
     toast.success("Hallazgo cerrado");
     toast.error("No se pudo guardar", { descripcion: err.message });
     toast.info("Copiado", { accion: { label: "Deshacer", onClick: deshacer } });
     const id = toast.loading("Enviando…");  toast.success("Enviado", { id });   // reemplaza
     await toast.promise(sincronizar(), {
       loading: "Sincronizando…",
       success: "Todo enviado",
       error: (e) => ({ titulo: "No se pudo sincronizar", descripcion: e.message }),
     });                                  // devuelve la misma promesa
     toast.dismiss(id);                   // sin id: cierra todos

   Opciones: { id, descripcion, accion: { label, onClick }, duracion (ms o Infinity),
   cerrable, onCerrar }. Duraciones: 4 s éxito/info, 6 s advertencia, 8 s error, 10 s si
   tiene acción, sin límite mientras carga. Se pausan con el mouse encima, con foco adentro
   o con la pestaña oculta. Máximo 3 a la vista (apilados; se despliegan al pasar el mouse).
   Se descartan deslizándolos de costado. Alt+T lleva el foco a los avisos; Escape cierra el
   que tiene el foco.

   <ToastProvider posicion="auto"> va una vez en la raíz (main.jsx). posicion: "auto" (arriba
   al centro en el celular —abajo están la barra de navegación y la de acciones del
   formulario—, abajo a la derecha desde 640 px) | "top-center" | "bottom-center" | "bottom-right".
   ===================================================================================== */

const DURACION = { success: 4000, info: 4000, warning: 6000, error: 8000, loading: Infinity };
const DURACION_CON_ACCION = 10000;
const MAX_VISIBLES = 3;
const SEPARACION = 8; // entre toasts desplegados
const ASOMA = 10; // cuánto asoma cada toast de atrás en la pila cerrada
const SALIDA_MS = 320;

const ICONO = { success: "checkCircle", error: "xCircle", warning: "alert", info: "info" };

// ---------- Almacén (fuera de React: se puede avisar desde cualquier lado) ----------
let lista = []; // el más nuevo primero
let anuncio = { texto: "", urgente: false, n: 0 };
const suscriptores = new Set();
let contador = 0;

const emitir = () => suscriptores.forEach((fn) => fn());
const suscribir = (fn) => {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
};

const comoMensaje = (m) => (m && typeof m === "object" && !Array.isArray(m) ? m : { titulo: m });

function publicar(tipo, titulo, opciones = {}) {
  const id = opciones.id ?? `toast-${++contador}`;
  const previo = lista.find((t) => t.id === id);
  const conAccion = Boolean(opciones.accion) && tipo !== "loading";
  const t = {
    id,
    tipo,
    titulo,
    descripcion: opciones.descripcion,
    accion: opciones.accion,
    duracion: opciones.duracion ?? (conAccion ? Math.max(DURACION_CON_ACCION, DURACION[tipo]) : DURACION[tipo]),
    cerrable: opciones.cerrable ?? true,
    onCerrar: opciones.onCerrar,
    version: (previo?.version ?? 0) + 1,
    saliendo: false,
  };
  lista = previo ? lista.map((x) => (x.id === id ? t : x)) : [t, ...lista];
  // Lectores de pantalla: los errores interrumpen, el resto espera su turno.
  if (tipo !== "loading" || !previo) {
    anuncio = { texto: [titulo, opciones.descripcion].filter(Boolean).join(". "), urgente: tipo === "error", n: anuncio.n + 1 };
  }
  emitir();
  return id;
}

function cerrar(id, { dx = 0 } = {}) {
  const afectados = lista.filter((t) => (id == null || t.id === id) && !t.saliendo);
  if (!afectados.length) return;
  const ids = new Set(afectados.map((t) => t.id));
  lista = lista.map((t) => (ids.has(t.id) ? { ...t, saliendo: true, dxSalida: dx } : t));
  emitir();
  afectados.forEach((t) => t.onCerrar?.());
  setTimeout(() => {
    lista = lista.filter((t) => !(ids.has(t.id) && t.saliendo));
    emitir();
  }, SALIDA_MS);
}

export const toast = Object.assign((titulo, opciones) => publicar("info", titulo, opciones), {
  success: (titulo, opciones) => publicar("success", titulo, opciones),
  error: (titulo, opciones) => publicar("error", titulo, opciones),
  warning: (titulo, opciones) => publicar("warning", titulo, opciones),
  info: (titulo, opciones) => publicar("info", titulo, opciones),
  loading: (titulo, opciones) => publicar("loading", titulo, opciones),
  promise(promesa, { loading = "Cargando…", success = "Listo", error = "Algo salió mal", ...opciones } = {}) {
    const id = publicar("loading", comoMensaje(loading).titulo, { ...opciones, descripcion: comoMensaje(loading).descripcion });
    const resolver = (tipo, plantilla, valor) => {
      const { titulo, ...resto } = comoMensaje(typeof plantilla === "function" ? plantilla(valor) : plantilla);
      publicar(tipo, titulo, { ...opciones, ...resto, id });
    };
    Promise.resolve(promesa).then(
      (v) => resolver("success", success, v),
      (e) => resolver("error", error, e)
    );
    return promesa;
  },
  dismiss: (id) => cerrar(id),
});

export function useToast() {
  return toast;
}

// ---------- Vista ----------
export function ToastProvider({ children, posicion = "auto" }) {
  return (
    <>
      {children}
      {createPortal(<Toaster posicion={posicion} />, document.body)}
    </>
  );
}

function Toaster({ posicion }) {
  const toasts = useSyncExternalStore(suscribir, () => lista);
  const { texto, urgente, n } = useSyncExternalStore(suscribir, () => anuncio);
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const pos = posicion === "auto" ? (celular ? "top-center" : "bottom-right") : posicion;
  const [y, x] = pos.split("-");
  const [encima, setEncima] = useState(false);
  const [foco, setFoco] = useState(false);
  const [oculta, setOculta] = useState(() => document.hidden);
  const [alturas, setAlturas] = useState({});
  const seccionRef = useRef(null);

  useEffect(() => {
    const cambiar = () => setOculta(document.hidden);
    document.addEventListener("visibilitychange", cambiar);
    // Alt+T: ir a los avisos con el teclado.
    const atajo = (e) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        const primero = seccionRef.current?.querySelector(".toast");
        if (primero) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    window.addEventListener("keydown", atajo);
    return () => {
      document.removeEventListener("visibilitychange", cambiar);
      window.removeEventListener("keydown", atajo);
    };
  }, []);

  // Sin avisos, la pila vuelve a cerrarse.
  useEffect(() => {
    if (toasts.length === 0) {
      setEncima(false);
      setFoco(false);
    }
  }, [toasts.length]);

  const visibles = toasts.slice(0, MAX_VISIBLES);
  const desplegada = encima || foco;
  const pausado = desplegada || oculta;
  const signo = y === "top" ? 1 : -1;
  const altoDe = (t) => alturas[t.id] ?? 64;
  const altoFrente = visibles[0] ? altoDe(visibles[0]) : 0;

  let acumulado = 0;
  const geometria = visibles.map((t, i) => {
    const g = desplegada
      ? { y: signo * acumulado, escala: 1, tapado: false, alto: undefined }
      : { y: signo * i * ASOMA, escala: 1 - i * 0.05, tapado: i > 0, alto: i > 0 ? altoFrente : undefined };
    acumulado += altoDe(t) + SEPARACION;
    return g;
  });
  const altoLista = visibles.length === 0 ? 0 : desplegada ? acumulado - SEPARACION : altoFrente + (visibles.length - 1) * ASOMA;

  const medir = useCallback((id, alto) => setAlturas((a) => (a[id] === alto ? a : { ...a, [id]: alto })), []);

  return (
    <section
      ref={seccionRef}
      className="toaster"
      data-x={x}
      data-y={y}
      aria-label="Avisos (Alt+T)"
      tabIndex={-1}
      onFocus={() => setFoco(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFoco(false);
      }}
    >
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {!urgente ? <span key={n}>{texto}</span> : null}
      </div>
      <div className="visually-hidden" role="alert" aria-live="assertive" aria-atomic="true">
        {urgente ? <span key={n}>{texto}</span> : null}
      </div>
      <ol
        className="toaster__lista"
        style={{ height: altoLista, pointerEvents: visibles.length ? "auto" : "none" }}
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
      >
        {visibles.map((t, i) => (
          <ToastItem key={t.id} t={t} indice={i} geometria={geometria[i]} signo={signo} pausado={pausado} onMedir={medir} />
        ))}
      </ol>
    </section>
  );
}

function ToastItem({ t, indice, geometria, signo, pausado, onMedir }) {
  const contenidoRef = useRef(null);
  const liRef = useRef(null);
  const restanteRef = useRef(t.duracion);
  const arrastreRef = useRef(null);
  const [montado, setMontado] = useState(false);
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Alto natural (para apilar y desplegar sin saltos).
  useLayoutEffect(() => {
    const el = contenidoRef.current;
    if (!el) return undefined;
    const medir = () => onMedir(t.id, el.offsetHeight + 2); // + borde
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [t.id, onMedir]);

  // Temporizador: se reinicia cuando el toast se reemplaza (ej. cargando → listo).
  useEffect(() => {
    restanteRef.current = t.duracion;
  }, [t.version, t.duracion]);

  useEffect(() => {
    if (t.saliendo || pausado || !Number.isFinite(t.duracion)) return undefined;
    const inicio = Date.now();
    const timer = setTimeout(() => cerrar(t.id), Math.max(0, restanteRef.current));
    return () => {
      clearTimeout(timer);
      restanteRef.current -= Date.now() - inicio;
    };
  }, [pausado, t.version, t.saliendo, t.duracion, t.id]);

  // Deslizar de costado para descartar.
  const alApoyar = (e) => {
    if (!t.cerrable || e.target.closest("button, a")) return;
    arrastreRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), activo: false };
  };
  const alMover = (e) => {
    const a = arrastreRef.current;
    if (!a) return;
    const mx = e.clientX - a.x;
    const my = e.clientY - a.y;
    if (!a.activo) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      if (Math.abs(my) > Math.abs(mx)) {
        arrastreRef.current = null; // es un scroll, no un descarte
        return;
      }
      a.activo = true;
      setArrastrando(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDx(mx);
  };
  const alSoltar = (e) => {
    const a = arrastreRef.current;
    arrastreRef.current = null;
    if (!a?.activo) return;
    setArrastrando(false);
    const mx = e.clientX - a.x;
    const ancho = liRef.current?.offsetWidth || 320;
    const velocidad = Math.abs(mx) / Math.max(1, performance.now() - a.t);
    if (Math.abs(mx) > ancho * 0.35 || velocidad > 0.45) cerrar(t.id, { dx: Math.sign(mx) * (ancho + 40) });
    else setDx(0);
  };

  const ancho = liRef.current?.offsetWidth || 320;
  const entrando = !montado;
  const saliendo = t.saliendo;
  const desplazamiento = saliendo && t.dxSalida ? t.dxSalida : dx;
  const estilo = {
    "--y": `${entrando ? geometria.y - signo * 24 : saliendo && !t.dxSalida ? geometria.y - signo * 16 : geometria.y}px`,
    "--dx": `${desplazamiento}px`,
    "--escala": entrando ? 0.96 : geometria.escala,
    "--opacidad": entrando || saliendo ? 0 : arrastrando ? Math.max(0.2, 1 - Math.abs(dx) / ancho) : indice > 2 ? 0 : 1,
    height: geometria.alto,
    zIndex: MAX_VISIBLES - indice,
  };

  return (
    <li
      ref={liRef}
      className="toast"
      data-tipo={t.tipo}
      data-tapado={geometria.tapado || undefined}
      data-arrastrando={arrastrando || undefined}
      tabIndex={0}
      style={estilo}
      onKeyDown={(e) => {
        if (e.key === "Escape" && t.cerrable) {
          e.stopPropagation();
          cerrar(t.id);
        }
      }}
      onPointerDown={alApoyar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
    >
      <div ref={contenidoRef} className="toast__contenido">
        <span className="toast__icono" aria-hidden="true">
          {t.tipo === "loading" ? <span className="spinner" style={{ width: 20, height: 20 }} /> : <Icon name={ICONO[t.tipo]} size={20} />}
        </span>
        <div className="toast__cuerpo">
          <div className="toast__titulo">{t.titulo}</div>
          {t.descripcion ? <div className="toast__descripcion">{t.descripcion}</div> : null}
        </div>
        {t.accion ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm toast__accion"
            onClick={() => {
              t.accion.onClick?.();
              cerrar(t.id);
            }}
          >
            {t.accion.label}
          </button>
        ) : null}
        {t.cerrable && t.tipo !== "loading" ? (
          <button type="button" className="toast__cerrar" aria-label="Cerrar aviso" onClick={() => cerrar(t.id)}>
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </div>
    </li>
  );
}
