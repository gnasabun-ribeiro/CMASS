import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Banner from "../components/ui/Banner.jsx";
import EmptyState, { Skeleton } from "../components/ui/EmptyState.jsx";
import { Input } from "../components/ui/Field.jsx";
import { ESTADOS, ESTADO_COLORS, hallazgosColor } from "../data/mockRegistros.js";
import { findModulo, findSub, rutaFormulario, rutaVolver } from "../data/modulos.js";
import { supabaseConfigured } from "../lib/supabaseClient.js";
import { listarInspecciones } from "../lib/inspeccionesRemoto.js";
import { TABLAS_GENERICAS, TABLAS_OBRA } from "../lib/tablas.js";
import { listarCola, listarInspeccionesLocales } from "../lib/localDb.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSync } from "../lib/useSync.js";
import { BREAKPOINTS, useMediaQuery } from "../lib/breakpoints.js";
import DetalleRegistro from "../components/DetalleRegistro.jsx";
import { normalizar } from "../lib/texto.js";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function tituloDe(moduloId, subId, cliente) {
  const nombre = findSub(moduloId, subId)?.title || findModulo(moduloId)?.title || "Inspección";
  return `${nombre} — ${cliente || "Sin cliente"}`;
}

function aRegistro(r) {
  const f = new Date(r.fecha_hora || r.created_at);
  return {
    id: r.id,
    moduloId: r.moduloId,
    subId: r.subId,
    fecha: f,
    dia: String(f.getDate()).padStart(2, "0"),
    mes: MESES[f.getMonth()],
    titulo: tituloDe(r.moduloId, r.subId, r.cliente),
    detalle: [r.ubicacion, r.grupo_auditado].filter(Boolean).join(" · ") || "Sin datos generales",
    hallazgos: r.hallazgos,
    estado: r.estado === "enviado" ? "Enviado" : "Borrador",
  };
}

// Copia local (guardada en el dispositivo): con cambios sin enviar, o sin conexión.
function localARegistro(rec, pendiente) {
  const g = rec.generales;
  const f = new Date(g.fechaHora || rec.actualizadoEn || Date.now());
  const moduloId = rec.moduloId ?? "obra"; // las copias viejas no traen módulo: eran de obra
  return {
    id: rec.id,
    moduloId,
    subId: rec.subId ?? null,
    fecha: f,
    dia: String(f.getDate()).padStart(2, "0"),
    mes: MESES[f.getMonth()],
    titulo: tituloDe(moduloId, rec.subId, g.cliente),
    detalle: [g.ubicacion, g.grupoAuditado].filter(Boolean).join(" · ") || "Sin datos generales",
    hallazgos: rec.hallazgos.length,
    estado: rec.estado === "enviado" ? "Enviado" : "Borrador",
    pendiente,
  };
}

function tieneContenido(rec) {
  const g = rec.generales;
  return (
    rec.estado === "enviado" ||
    Object.values(g).some(Boolean) ||
    Object.keys(rec.respuestas).length > 0 ||
    rec.hallazgos.length > 0 ||
    (rec.galeria?.length ?? 0) > 0 ||
    Object.keys(rec.firmas).length > 0
  );
}

const noVacio = (r) => r.estado === "enviado" || r.cliente || r.ubicacion || r.grupo_auditado || r.tarea_observada || r.hallazgos || r.respuestas;

export default function Lista() {
  const { moduloId, subId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const sync = useSync();
  // Desde 1024 px: lista a la izquierda y resumen del registro elegido a la derecha.
  const dosPaneles = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const [elegidoId, setElegidoId] = useState(null);
  const [filtro, setFiltro] = useState("Todos");

  const modulo = moduloId ? findModulo(moduloId) : null;
  const sub = moduloId && subId ? findSub(moduloId, subId) : null;

  let title = "Mis Registros";
  let subtitle = "Registros cargados";
  let backTo = moduloId ? rutaVolver(moduloId) : "/";
  if (sub) {
    title = sub.title;
    backTo = `/modulos/${moduloId}`;
  } else if (modulo) {
    title = `${modulo.title} — Registros`;
  }

  // "Mis Registros" lista todos los módulos; los demás, el módulo (o la regla) indicado.
  const hayLista = supabaseConfigured && (!moduloId || Boolean(modulo?.form || modulo?.subs));
  const [todos, setTodos] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState(hayLista ? "cargando" : "ok");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Junta lo del servidor con lo guardado en el dispositivo (sin conexión solo se ve lo local).
  // La copia local gana solo si tiene cambios sin enviar, si nunca llegó al servidor o si no se
  // pudo consultar su tabla; si no, vale la del servidor (otro dispositivo o el administrador
  // pueden haberla cambiado, o borrado).
  useEffect(() => {
    if (!hayLista) return;
    let cancelado = false;
    (async () => {
      const consultas = []; // [esObra, promesa]
      if (!moduloId || moduloId === "obra") consultas.push([true, listarInspecciones(TABLAS_OBRA)]);
      if (!moduloId || moduloId !== "obra") consultas.push([false, listarInspecciones(TABLAS_GENERICAS, { moduloId, subId: sub?.id })]);
      const [partes, locales, cola] = await Promise.all([
        Promise.all(consultas.map(([, c]) => c.catch(() => null))),
        listarInspeccionesLocales().catch(() => []),
        listarCola().catch(() => []),
      ]);
      if (cancelado) return;
      const sinConexion = partes.every((p) => p === null);
      const remotos = partes.filter(Boolean).flat();
      const respondio = { obra: false, generico: false };
      consultas.forEach(([esObra], i) => (respondio[esObra ? "obra" : "generico"] = partes[i] !== null));
      const pendientes = new Set(cola.map((op) => op.inspeccionId));
      const porId = new Map();
      // Descarta borradores vacíos del servidor (se crearon y nunca se completaron).
      remotos.filter(noVacio).forEach((r) => porId.set(r.id, aRegistro(r)));
      locales
        .filter((rec) => rec.inspectorId === userId && tieneContenido(rec))
        .filter((rec) => !moduloId || (rec.moduloId ?? "obra") === moduloId)
        .filter((rec) => !sub || rec.subId === sub.id)
        .filter((rec) => pendientes.has(rec.id) || !rec.enServidor || !respondio[(rec.moduloId ?? "obra") === "obra" ? "obra" : "generico"])
        .forEach((rec) => porId.set(rec.id, localARegistro(rec, pendientes.has(rec.id))));
      const lista = [...porId.values()].sort((x, y) => y.fecha - x.fecha);
      setTodos(lista);
      // Solo es un error si tampoco hay nada local para mostrar.
      setEstadoCarga(sinConexion && lista.length === 0 ? "error" : "ok");
    })();
    return () => {
      cancelado = true;
    };
  }, [hayLista, moduloId, subId, userId, sync.pendientes]);

  const registros = useMemo(() => {
    const q = normalizar(busqueda); // "nandu" encuentra "Ñandú"
    const d = desde ? new Date(`${desde}T00:00:00`) : null;
    const h = hasta ? new Date(`${hasta}T23:59:59`) : null;
    return todos.filter(
      (r) =>
        (filtro === "Todos" || r.estado === filtro) &&
        (!q || normalizar(`${r.titulo} ${r.detalle}`).includes(q)) &&
        (!d || r.fecha >= d) &&
        (!h || r.fecha <= h)
    );
  }, [todos, filtro, busqueda, desde, hasta]);

  const hayFiltros = filtro !== "Todos" || Boolean(busqueda.trim() || desde || hasta);
  const limpiarFiltros = () => {
    setFiltro("Todos");
    setBusqueda("");
    setDesde("");
    setHasta("");
  };

  // /registros/<algo que no existe>: antes mostraba "Mis Registros" vacío.
  if ((moduloId && !(modulo?.form || modulo?.subs)) || (subId && !sub)) return <Navigate to="/registros" replace />;

  const vacio =
    estadoCarga === "error"
      ? { icono: "cloudOff", titulo: "No se pudieron cargar los registros", texto: "Revisá la conexión. Lo guardado en este dispositivo se muestra igual." }
      : todos.length && hayFiltros
        ? { icono: "search", titulo: "Ningún registro coincide", texto: "Probá con otra búsqueda o con otras fechas." }
        : { icono: "inbox", titulo: "Todavía no hay registros", texto: "Las inspecciones que cargues van a aparecer acá." };

  const abrir = (r) => navigate(rutaFormulario(r.moduloId, r.subId, r.id), { state: { volverA: location.pathname } });
  // En la computadora, tocar un registro muestra su resumen al lado; en celular y tablet lo abre.
  const elegido = dosPaneles ? registros.find((r) => r.id === elegidoId) : null;

  const lista = (
    <>
      {estadoCarga === "cargando" && registros.length === 0 ? (
        <div aria-busy="true" aria-label="Cargando registros" style={{ display: "grid", gap: "var(--space-2)" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel panel--compacto" style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", boxShadow: "var(--shadow-1)" }}>
              <Skeleton width={52} height={52} radius="var(--radius-lg)" />
              <div style={{ flex: 1, display: "grid", gap: "var(--space-2)" }}>
                <Skeleton width="65%" height={14} />
                <Skeleton width="40%" height={12} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="registros-lista">
        {registros.map((r, i) => {
          const estadoColor = ESTADO_COLORS[r.estado];
          const estado = (
            <span className="chip" style={{ background: estadoColor.bg, color: estadoColor.fg }}>
              {r.estado}
              {r.pendiente ? " · sin enviar" : ""}
            </span>
          );
          const hallazgos = (
            <span className="t-caption registro__hallazgos" style={{ color: "var(--text-tertiary)" }}>
              <span className="registro__hallazgos-etiqueta">Hallazgos</span>
              <strong className="heading tabular" style={{ color: hallazgosColor(r.hallazgos) }}>
                {r.hallazgos}
              </strong>
            </span>
          );
          return (
            <li key={r.id} className="pop-in" style={{ animationDelay: `${Math.min(i, 12) * 0.035}s` }}>
              <button
                type="button"
                // volverA: al cerrar o salir del formulario se vuelve a esta lista (ver Formulario).
                onClick={() => (dosPaneles ? setElegidoId(r.id) : abrir(r))}
                aria-current={elegido?.id === r.id ? "true" : undefined}
                className="panel panel--compacto registro"
              >
                <span className="registro__fecha" aria-hidden="true">
                  <span className="heading tabular" style={{ fontWeight: "var(--weight-heavy)", fontSize: "var(--text-headline)", color: "var(--accent-text)" }}>
                    {r.dia}
                  </span>
                  <span className="t-overline" style={{ marginTop: "var(--space-0-5)" }}>
                    {r.mes}
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t-headline" style={{ display: "block", fontSize: "var(--text-callout)", overflowWrap: "anywhere" }}>
                    {r.titulo}
                  </span>
                  <span className="t-caption" style={{ display: "block", color: "var(--text-tertiary)", marginTop: "var(--space-0-5)", overflowWrap: "anywhere" }}>
                    {r.detalle}
                  </span>
                  {/* Columna angosta (celular, o la lista al lado del resumen): estado y hallazgos
                      van debajo del título; a la derecha no entraban. Lo decide el ancho de la
                      lista (container query en componentes.css), no el de la pantalla. */}
                  <span className="registro__abajo">
                    {estado}
                    {hallazgos}
                  </span>
                </span>
                <span className="registro__derecha">
                  {hallazgos}
                  {estado}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {registros.length === 0 && estadoCarga !== "cargando" ? (
        <EmptyState
          sobreFondo
          {...vacio}
          accion={
            todos.length && hayFiltros ? (
              <button type="button" className="btn btn--surface btn--sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            ) : null
          }
        />
      ) : null}
    </>
  );

  return (
    <AppShell title={title} subtitle={subtitle} onBack={() => navigate(backTo)}>
      <div className="panel panel--compacto" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          aria-label="Buscar"
          placeholder="Buscar por cliente, ubicación o grupo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: "2 1 220px", width: "auto" }}
        />
        <Input type="date" aria-label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ flex: "1 1 140px", width: "auto" }} />
        <Input type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ flex: "1 1 140px", width: "auto" }} />
        {desde && hasta && desde > hasta ? (
          <Banner tono="warning" alerta style={{ flex: "1 1 100%" }}>
            "Desde" es posterior a "Hasta": no puede haber registros en ese rango.
          </Banner>
        ) : null}
      </div>

      <div className="fila-pills sobre-fondo" role="group" aria-label="Estado" style={{ marginBottom: "var(--space-3)" }}>
        {ESTADOS.map((f) => (
          <button key={f} type="button" className="pill" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {f}
          </button>
        ))}
        {hayFiltros ? (
          <button type="button" className="pill pill--texto" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {dosPaneles && registros.length ? (
        <div className="dos-paneles">
          <div className="dos-paneles__lista">{lista}</div>
          <aside className="dos-paneles__detalle panel" aria-label="Resumen del registro">
            {elegido ? (
              <DetalleRegistro key={elegido.id} registro={elegido} onAbrir={() => abrir(elegido)} />
            ) : (
              <EmptyState icono="clipboard" titulo="Elegí un registro" texto="Acá vas a ver su resumen sin salir de la lista: datos, checklist, hallazgos y firma." />
            )}
          </aside>
        </div>
      ) : (
        lista
      )}
    </AppShell>
  );
}
