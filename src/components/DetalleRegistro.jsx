import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Button from "./ui/Button.jsx";
import EmptyState, { Skeleton } from "./ui/EmptyState.jsx";
import { toast } from "./ui/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { cargarInspeccion } from "../lib/inspeccionesLocal.js";
import { datosDeInspeccion, descargarInformeDe } from "../lib/informeRegistro.js";
import { ESTADO_COLORS } from "../data/mockRegistros.js";

// Panel derecho de Registros en la computadora (≥1024 px): resumen de solo lectura del
// registro elegido, sin salir de la lista. "Abrir inspección" va al formulario como antes.

function fechaHora(valor) {
  if (!valor) return "—";
  const f = new Date(valor);
  return Number.isNaN(f.getTime()) ? valor : f.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function Seccion({ titulo, children }) {
  return (
    <section className="panel--inset" style={{ marginTop: "var(--space-3)" }}>
      <h3 className="panel__titulo">{titulo}</h3>
      {children}
    </section>
  );
}

export default function DetalleRegistro({ registro, onAbrir }) {
  const { puede } = useAuth();
  const [estado, setEstado] = useState({ rec: null, cargando: true, error: null });
  const [intento, setIntento] = useState(0);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setEstado({ rec: null, cargando: true, error: null });
    cargarInspeccion(registro.id, registro.moduloId)
      .then((rec) => vivo && setEstado({ rec, cargando: false, error: null }))
      .catch((e) => vivo && setEstado({ rec: null, cargando: false, error: navigator.onLine ? e.message : "Sin conexión y sin copia en este dispositivo." }));
    return () => {
      vivo = false;
    };
  }, [registro.id, registro.moduloId, intento]);

  const color = ESTADO_COLORS[registro.estado];
  const encabezado = (
    <header style={{ display: "grid", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
        <span className="chip" style={{ background: color.bg, color: color.fg }}>
          {registro.estado}
          {registro.pendiente ? " · sin enviar" : ""}
        </span>
        <span className="t-caption" style={{ color: "var(--text-tertiary)" }}>
          {registro.fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      <h2 className="t-title" style={{ overflowWrap: "anywhere" }}>
        {registro.titulo}
      </h2>
    </header>
  );

  if (estado.cargando) {
    return (
      <div aria-busy="true" aria-label="Cargando el registro" style={{ display: "grid", gap: "var(--space-3)" }}>
        {encabezado}
        <Skeleton height={120} radius="var(--radius-lg)" />
        <Skeleton height={88} radius="var(--radius-lg)" />
        <Skeleton height={140} radius="var(--radius-lg)" />
      </div>
    );
  }

  if (estado.error) {
    return (
      <>
        {encabezado}
        <EmptyState
          icono="cloudOff"
          titulo="No se pudo cargar el registro"
          texto={estado.error}
          compacto
          accion={
            <Button size="sm" icon="refresh" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </Button>
          }
        />
      </>
    );
  }

  const { rec } = estado;
  const d = datosDeInspeccion(rec);
  const g = rec.generales;
  const filas = d.esTop
    ? [
        ["Apellido y nombre", g.datos?.observador],
        ["Función", g.datos?.funcion],
        ["Área de trabajo", g.ubicacion],
        ["Cliente / obra", g.cliente],
        ["Fecha", fechaHora(g.fechaHora)],
      ]
    : [
        ["Cliente", g.cliente],
        ["Ubicación / zona", g.ubicacion],
        ["Grupo auditado", g.grupoAuditado],
        ["Fecha y hora", fechaHora(g.fechaHora)],
      ];
  const firmado = Object.values(rec.firmas)[0];

  const descargar = () => {
    setGenerando(true);
    toast
      .promise(descargarInformeDe(rec, registro.titulo), {
        loading: "Generando el PDF…",
        success: "PDF descargado",
        error: (e) => ({ titulo: "No se pudo generar el PDF", descripcion: navigator.onLine ? e?.message : "Revisá la conexión y probá de nuevo." }),
      })
      .catch(() => {})
      .finally(() => setGenerando(false));
  };

  return (
    <article aria-label={`Resumen: ${registro.titulo}`}>
      {encabezado}

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-4)" }}>
        <Button variant="solid" iconEnd="arrowRight" onClick={onAbrir}>
          Abrir inspección
        </Button>
        {puede("descargarPdf") ? (
          <Button variant="outline" icon="download" loading={generando} onClick={descargar}>
            Descargar PDF
          </Button>
        ) : null}
      </div>

      <Seccion titulo="Datos generales">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="fila-dato">
            <span>{etiqueta}</span>
            <strong>{valor?.trim?.() || valor || "—"}</strong>
          </div>
        ))}
        {!d.esTop && g.tareaObservada?.trim() ? (
          <p className="t-footnote" style={{ marginTop: "var(--space-2)", color: "var(--text-secondary)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {g.tareaObservada}
          </p>
        ) : null}
      </Seccion>

      <Seccion titulo={`Checklist (${d.conteo.total - d.conteo.sinResponder} de ${d.conteo.total} respondidos)`}>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {d.esTop ? (
            <>
              <span className="chip chip--success">{d.conteo.ok} seguros</span>
              <span className="chip chip--danger">{d.conteo.no} desvíos</span>
            </>
          ) : (
            <>
              <span className="chip chip--success">{d.conteo.ok} cumple</span>
              <span className="chip chip--warning">{d.conteo.parcial} parcial</span>
              <span className="chip chip--danger">{d.conteo.no} no cumple</span>
            </>
          )}
          <span className="chip">{d.conteo.na} N/A</span>
          {d.conteo.sinResponder ? <span className="chip">{d.conteo.sinResponder} sin responder</span> : null}
        </div>
      </Seccion>

      {!d.esTop ? (
        <Seccion titulo={`Hallazgos (${d.hallazgos.length})`}>
          {d.hallazgos.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
              {d.hallazgos.map((h) => (
                <li key={h.id ?? h.titulo} style={{ borderRadius: "var(--radius-md)", background: "var(--hallazgo-bg)", border: "var(--hairline) solid var(--hallazgo-border)", padding: "var(--space-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    <strong className="t-footnote" style={{ fontWeight: "var(--weight-bold)", overflowWrap: "anywhere" }}>
                      {h.titulo}
                    </strong>
                    <span className="chip" style={{ background: h.sevBg, color: h.sevFg }}>
                      {h.severidad}
                    </span>
                  </div>
                  <div className="t-caption" style={{ color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
                    Responsable: {h.responsable} · Vence: {h.vence}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-footnote" style={{ color: "var(--text-tertiary)" }}>
              Sin hallazgos.
            </p>
          )}
        </Seccion>
      ) : null}

      <Seccion titulo="Cierre">
        {!d.esTop ? (
          <div className="fila-dato">
            <span>Fotos</span>
            <strong>{(rec.galeria ?? []).length}</strong>
          </div>
        ) : null}
        <div className="fila-dato">
          <span>Firma del inspector</span>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", color: firmado ? "var(--success-fg)" : "var(--text-tertiary)" }}>
            {firmado ? <Icon name="check" size={16} /> : null}
            {firmado ? firmado.nombre : "Sin firmar"}
          </strong>
        </div>
      </Seccion>
    </article>
  );
}
