import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import Button from "./ui/Button.jsx";
import Sheet from "./ui/Sheet.jsx";
import EmptyState, { Skeleton } from "./ui/EmptyState.jsx";
import Banner from "./ui/Banner.jsx";
import { toast } from "./ui/Toast.jsx";
import { activarAvisos, desactivarAvisos, estadoAvisos } from "../lib/push.js";
import { usePresencia } from "./ui/usePresencia.js";
import { useNotifications } from "../lib/notificaciones.js";
import { CONSULTA_CELULAR, useMediaQuery } from "../lib/breakpoints.js";

// Campana del encabezado con el contador de no leídas y el panel de notificaciones: popover
// anclado en la computadora, hoja desde abajo en el celular. Los datos salen de
// useNotifications (src/lib/notificaciones.js).

const TONO = {
  success: { icono: "checkCircle", bg: "var(--success-bg)", fg: "var(--success-fg)" },
  error: { icono: "alertCircle", bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
  warning: { icono: "alert", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  info: { icono: "info", bg: "var(--info-bg)", fg: "var(--info-fg)" },
};

const relativo = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto", style: "short" });

function hace(fecha, ahora) {
  const seg = Math.round((new Date(fecha) - ahora) / 1000);
  if (seg > -45) return "recién";
  const min = Math.round(seg / 60);
  if (min > -60) return relativo.format(min, "minute");
  const horas = Math.round(min / 60);
  if (horas > -24) return relativo.format(horas, "hour");
  return new Date(fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function agrupar(lista, ahora) {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const grupos = [
    { titulo: "Hoy", items: [] },
    { titulo: "Ayer", items: [] },
    { titulo: "Anteriores", items: [] },
  ];
  for (const n of lista) {
    const f = new Date(n.fecha);
    grupos[f >= hoy ? 0 : f >= ayer ? 1 : 2].items.push(n);
  }
  return grupos.filter((g) => g.items.length);
}

export default function Notificaciones() {
  const datos = useNotifications();
  const { noLeidas } = datos;
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const [abierto, setAbierto] = useState(false);
  const [sonando, setSonando] = useState(false);
  const campanaRef = useRef(null);
  const previasRef = useRef(noLeidas);

  // Al llegar una nueva: la campana se mueve y el contador "salta".
  useEffect(() => {
    if (noLeidas > previasRef.current) {
      setSonando(true);
      const t = setTimeout(() => setSonando(false), 700);
      previasRef.current = noLeidas;
      return () => clearTimeout(t);
    }
    previasRef.current = noLeidas;
    return undefined;
  }, [noLeidas]);

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco && !celular) campanaRef.current?.focus();
  };

  const etiqueta = noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones";

  return (
    <>
      <button
        ref={campanaRef}
        type="button"
        className={`btn btn--outline btn--icon campana${sonando ? " campana--sonando" : ""}`}
        style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
      >
        <Icon name="bell" size={20} />
        {noLeidas > 0 ? (
          <span key={noLeidas} className={`badge${sonando ? " badge--pop" : ""}`} aria-hidden="true">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        ) : null}
      </button>
      {celular ? (
        <Sheet
          abierto={abierto}
          onCerrar={() => cerrar(false)}
          titulo="Notificaciones"
          alto
          cuerpoClassName="sheet__cuerpo--sin-padding"
          encabezado={<Acciones datos={datos} />}
          pie={<AvisosDelNavegador />}
        >
          <Contenido datos={datos} onIr={() => cerrar(false)} />
        </Sheet>
      ) : (
        <Popover abierto={abierto} anclaRef={campanaRef} onCerrar={cerrar}>
          <div className="notif-cabecera">
            <h2 className="notif-cabecera__titulo">Notificaciones</h2>
            <Acciones datos={datos} enLinea />
          </div>
          <Contenido datos={datos} onIr={() => cerrar(false)} />
          <div style={{ borderTop: "var(--hairline) solid var(--border)", padding: "var(--space-3) var(--space-4)" }}>
            <AvisosDelNavegador />
          </div>
        </Popover>
      )}
    </>
  );
}

// "Avisos en este dispositivo": pide permiso solo al tocar Activar (ver src/lib/push.js).
const TEXTO_AVISOS = {
  activo: "Te llegan aunque la app esté cerrada.",
  "en-segundo-plano": "Te llegan mientras la app está abierta, aunque estés en otra pestaña o aplicación.",
  inactivo: "Recibí un aviso del sistema cuando llegue una notificación.",
  bloqueado: "El navegador los tiene bloqueados para esta app: se habilitan desde la configuración del sitio.",
};

function AvisosDelNavegador() {
  const [estado, setEstado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoAvisos().then((e) => vivo && setEstado(e));
    return () => {
      vivo = false;
    };
  }, []);

  if (!estado || estado === "no-soportado") return null;
  const activos = estado === "activo" || estado === "en-segundo-plano";

  const cambiar = async () => {
    setOcupado(true);
    try {
      if (activos) {
        await desactivarAvisos();
        setEstado(await estadoAvisos());
        toast.info(estado === "activo" ? "Avisos con la app cerrada desactivados" : "Avisos desactivados", {
          descripcion: estado === "activo" ? undefined : "Para quitar el permiso del todo, usá la configuración del sitio en el navegador.",
        });
      } else {
        setEstado(await activarAvisos());
        toast.success("Avisos activados en este dispositivo");
      }
    } catch (e) {
      toast.error("No se pudieron activar los avisos", { descripcion: e.message });
      setEstado(await estadoAvisos());
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", width: "100%" }}>
      <span style={{ display: "inline-flex", color: activos ? "var(--success-fg)" : "var(--text-tertiary)" }} aria-hidden="true">
        <Icon name="bell" size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-footnote" style={{ fontWeight: "var(--weight-semibold)" }}>
          Avisos en este dispositivo{activos ? " · activos" : ""}
        </div>
        <div className="t-caption" style={{ color: "var(--text-tertiary)" }}>
          {TEXTO_AVISOS[estado]}
        </div>
      </div>
      {estado !== "bloqueado" && estado !== "en-segundo-plano" ? (
        <Button size="sm" variant={activos ? "ghost" : "secondary"} loading={ocupado} onClick={cambiar}>
          {activos ? "Desactivar" : "Activar"}
        </Button>
      ) : null}
    </div>
  );
}

function Acciones({ datos, enLinea = false }) {
  if (!datos.noLeidas) return enLinea ? null : <div style={{ height: "var(--space-2)" }} />;
  const boton = (
    <Button variant="ghost" size="sm" icon="check" onClick={datos.marcarTodasLeidas}>
      Marcar todas como leídas
    </Button>
  );
  return enLinea ? boton : <div style={{ padding: "0 var(--space-3) var(--space-2)", display: "flex", justifyContent: "flex-end" }}>{boton}</div>;
}

// Panel anclado debajo de la campana, alineado a su borde derecho.
function Popover({ abierto, anclaRef, onCerrar, children }) {
  const { montado, estado } = usePresencia(abierto, 150);
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useLayoutEffect(() => {
    if (!montado) return undefined;
    const calcular = () => {
      const r = anclaRef.current?.getBoundingClientRect();
      if (!r) return;
      const anchoVista = document.documentElement.clientWidth;
      setPos({ top: r.bottom + 8, right: Math.max(8, anchoVista - r.right) });
    };
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [montado, anclaRef]);

  // Foco adentro al abrir; se cierra con Escape, tocando afuera o si el foco sale.
  useEffect(() => {
    if (!abierto) return undefined;
    const cuadro = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    const alApoyar = (e) => {
      if (panelRef.current?.contains(e.target) || anclaRef.current?.contains(e.target)) return;
      onCerrarRef.current(false);
    };
    document.addEventListener("pointerdown", alApoyar, true);
    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener("pointerdown", alApoyar, true);
    };
  }, [abierto, anclaRef]);

  if (!montado || !pos) return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notificaciones"
      tabIndex={-1}
      className="popover notif-panel"
      data-estado={estado}
      data-alinear="fin"
      style={pos}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCerrarRef.current(true);
        }
      }}
      onBlur={(e) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && !anclaRef.current?.contains(e.relatedTarget)) onCerrarRef.current(false);
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function Contenido({ datos, onIr }) {
  const { notificaciones, cargando, error, reintentar } = datos;
  const [ahora, setAhora] = useState(() => Date.now());

  // Los "hace 5 min" se actualizan solos mientras el panel está abierto.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  if (cargando) {
    return (
      <div aria-busy="true" aria-label="Cargando notificaciones" style={{ padding: "var(--space-3) var(--space-4)", display: "grid", gap: "var(--space-4)" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", gap: "var(--space-3)" }}>
            <Skeleton width={36} height={36} radius="var(--radius-full)" />
            <div style={{ flex: 1, display: "grid", gap: "var(--space-2)" }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="90%" height={12} />
              <Skeleton width="30%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icono="cloudOff"
        titulo="No se pudieron cargar"
        texto={error}
        compacto
        accion={
          <Button size="sm" icon="refresh" onClick={reintentar}>
            Reintentar
          </Button>
        }
      />
    );
  }

  // El servidor no respondió, pero se muestra lo que hay (dispositivo + última copia).
  const aviso = datos.aviso ? (
    <div style={{ padding: "var(--space-3) var(--space-4) 0" }}>
      <Banner tono="warning" icono="cloudOff">
        {datos.aviso}
      </Banner>
    </div>
  ) : null;

  if (!notificaciones.length) {
    return (
      <>
        {aviso}
        <EmptyState
          icono="bell"
          titulo="No tenés notificaciones"
          texto="Acá vas a ver los hallazgos que te asignen o que estén por vencer, y cuándo termina de enviarse una inspección."
          compacto
        />
      </>
    );
  }

  return (
    <>
    {aviso}
    <ul className="notif-lista" aria-label="Notificaciones">
      {agrupar(notificaciones, ahora).map((g) => (
        <li key={g.titulo}>
          <div className="notif-grupo" role="presentation">
            {g.titulo}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.items.map((n) => (
              <Item key={n.id} n={n} ahora={ahora} datos={datos} onIr={onIr} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
    </>
  );
}

function Item({ n, ahora, datos, onIr }) {
  const navigate = useNavigate();
  const tono = TONO[n.tipo] || TONO.info;
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const arrastreRef = useRef(null);

  const abrir = () => {
    if (!n.leida) datos.marcarLeida(n);
    if (n.ruta) {
      onIr();
      navigate(n.ruta);
    }
  };

  // Deslizar hacia la izquierda para descartar (táctil).
  const alApoyar = (e) => {
    if (e.pointerType === "mouse") return;
    arrastreRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), activo: false };
  };
  const alMover = (e) => {
    const a = arrastreRef.current;
    if (!a) return;
    const mx = e.clientX - a.x;
    if (!a.activo) {
      if (Math.abs(mx) < 8) return;
      if (Math.abs(e.clientY - a.y) > Math.abs(mx)) {
        arrastreRef.current = null;
        return;
      }
      a.activo = true;
      setArrastrando(true);
    }
    setDx(Math.min(0, mx));
  };
  const alSoltar = (e) => {
    const a = arrastreRef.current;
    arrastreRef.current = null;
    if (!a?.activo) return;
    setArrastrando(false);
    const mx = e.clientX - a.x;
    const ancho = e.currentTarget.offsetWidth || 320;
    if (-mx > ancho * 0.4 || -mx / Math.max(1, performance.now() - a.t) > 0.5) {
      setDx(-ancho);
      setTimeout(() => datos.descartar(n), 180);
    } else setDx(0);
  };

  return (
    <li
      className="notif-item"
      data-leida={n.leida}
      data-arrastrando={arrastrando || undefined}
      style={{ "--dx": `${dx}px`, opacity: dx ? Math.max(0.3, 1 + dx / 320) : undefined }}
      onPointerDown={alApoyar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
    >
      <button
        type="button"
        className="notif-item__principal sin-hover"
        onClick={(e) => {
          if (arrastrando || dx) return e.preventDefault();
          abrir();
        }}
      >
        <span className="notif-item__icono" style={{ background: tono.bg, color: tono.fg }} aria-hidden="true">
          <Icon name={tono.icono} size={20} />
        </span>
        <span className="notif-item__cuerpo">
          <span className="notif-item__titulo" style={{ display: "block" }}>
            {n.leida ? null : <span className="visually-hidden">No leída: </span>}
            {n.titulo}
          </span>
          {n.descripcion ? (
            <span className="notif-item__descripcion clamp-2" title={n.descripcion}>
              {n.descripcion}
            </span>
          ) : null}
          <time className="notif-item__tiempo" style={{ display: "block" }} dateTime={n.fecha}>
            {hace(n.fecha, ahora)}
          </time>
        </span>
        {!n.leida ? <span className="notif-item__punto" aria-hidden="true" /> : null}
      </button>
      <button type="button" className="notif-item__descartar" aria-label={`Descartar: ${n.titulo}`} onClick={() => datos.descartar(n)}>
        <Icon name="x" size={16} />
      </button>
    </li>
  );
}
