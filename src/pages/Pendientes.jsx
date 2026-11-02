import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { findModulo, findSub, rutaFormulario } from "../data/modulos.js";
import { listarCola, obtenerInspeccion } from "../lib/localDb.js";
import { obtenerEstado, sincronizar } from "../lib/sync.js";
import { useSync } from "../lib/useSync.js";
import { useCelular } from "../lib/useCelular.js";
import Icon from "../components/Icon.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { toast } from "../components/ui/Toast.jsx";

const ETIQUETA_TIPO = {
  crear: "creación",
  generales: "datos generales",
  respuesta: "respuestas del checklist",
  hallazgo: "hallazgos",
  hallazgoEdit: "hallazgos corregidos",
  hallazgoDel: "hallazgos eliminados",
  foto: "fotos",
  firma: "firmas",
  enviar: "cierre",
};

function formatoHora(fecha) {
  return fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function Pendientes() {
  const navigate = useNavigate();
  const sync = useSync();
  const celular = useCelular();
  const [grupos, setGrupos] = useState([]);

  // Vuelve a armar el detalle cada vez que cambia la cola.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const cola = await listarCola();
      const porInspeccion = new Map();
      for (const op of cola) {
        if (!porInspeccion.has(op.inspeccionId)) porInspeccion.set(op.inspeccionId, []);
        porInspeccion.get(op.inspeccionId).push(op);
      }
      const lista = [];
      for (const [id, ops] of porInspeccion) {
        const rec = await obtenerInspeccion(id);
        const conteo = {};
        ops.forEach((op) => {
          if (op.tipo !== "crear") conteo[op.tipo] = (conteo[op.tipo] || 0) + 1;
        });
        const moduloId = rec?.moduloId ?? "obra";
        const nombreModulo = findSub(moduloId, rec?.subId)?.title || findModulo(moduloId)?.title || "Inspección";
        lista.push({
          id,
          ruta: rutaFormulario(moduloId, rec?.subId, id),
          titulo: `${nombreModulo} — ${rec?.generales?.cliente || "Sin cliente"}`,
          detalle: Object.entries(conteo)
            .map(([tipo, n]) => `${n} ${ETIQUETA_TIPO[tipo] || tipo}`)
            .join(" · "),
          error: ops.find((op) => op.error)?.error || sync.errores[id],
        });
      }
      if (!cancelado) setGrupos(lista);
    })();
    return () => {
      cancelado = true;
    };
  }, [sync.pendientes, sync.errores]);

  const subtitulo = sync.pendientes === 0 ? "Todo lo cargado ya está en el servidor" : "Se envían solos al recuperar señal";
  const estadoConexion = sync.online ? "Conectado" : "Sin conexión";
  const botonInactivo = sync.sincronizando || !sync.online || sync.pendientes === 0;

  // Antes no avisaba nada al terminar: ahora queda claro si se envió todo o qué falló.
  const sincronizarAhora = () =>
    toast
      .promise(sincronizar(), {
        loading: "Sincronizando…",
        success: () => {
          const { pendientes, errores } = obtenerEstado();
          if (pendientes === 0) return "Todo enviado";
          const conError = Object.keys(errores).length;
          return {
            titulo: `${pendientes} ${pendientes === 1 ? "cambio quedó" : "cambios quedaron"} sin enviar`,
            descripcion: conError ? "Hay errores: revisalos en la lista." : "Se reintenta solo en unos segundos.",
          };
        },
        error: (e) => ({ titulo: "No se pudo sincronizar", descripcion: e?.message }),
      })
      .catch(() => {});

  return (
    <AppShell title="Pendientes" subtitle={subtitulo} onBack={() => navigate("/")}>
      <section
        className="sobre-fondo"
        style={{
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-5)",
          background: "var(--brand-gradient)",
          color: "var(--text-on-app)",
          display: "flex",
          gap: "var(--space-4)",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div style={{ flex: 1, minWidth: 190 }}>
          <h2 className="t-headline" style={{ fontWeight: "var(--weight-heavy)" }}>
            {sync.pendientes === 0 ? "Sin registros pendientes" : `${sync.pendientes} ${sync.pendientes === 1 ? "cambio" : "cambios"} sin sincronizar`}
          </h2>
          <p className="t-footnote" style={{ color: "var(--text-on-app-muted)", marginTop: "var(--space-1)", display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
            <Icon name={sync.online ? "checkCircle" : "cloudOff"} size={16} />
            {estadoConexion}
            {sync.ultimaSync ? ` · Última sincronización: ${formatoHora(sync.ultimaSync)}` : ""}
          </p>
        </div>
        <Button
          variant="surface"
          size="lg"
          icon="refresh"
          loading={sync.sincronizando}
          disabled={botonInactivo}
          onClick={sincronizarAhora}
          style={{ width: celular ? "100%" : undefined }} // en el celular cae debajo del texto: a todo el ancho
        >
          {sync.sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </Button>
      </section>

      {grupos.length === 0 ? (
        <EmptyState sobreFondo icono="checkCircle" titulo="No hay nada por enviar" texto="Todo lo que cargaste ya llegó al servidor." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: "var(--space-2)" }}>
          {grupos.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => navigate(g.ruta)}
                className="panel panel--compacto"
                style={{ width: "100%", height: "100%", textAlign: "left", border: 0, boxShadow: "var(--shadow-1)", color: "var(--text-primary)" }}
              >
                <span className="t-callout" style={{ display: "block", fontWeight: "var(--weight-semibold)", overflowWrap: "anywhere" }}>
                  {g.titulo}
                </span>
                <span className="t-caption" style={{ display: "block", color: "var(--text-tertiary)", marginTop: "var(--space-0-5)" }}>
                  {g.detalle || "Pendiente de creación"}
                </span>
                {g.error ? (
                  <span className="t-caption" style={{ display: "flex", gap: "var(--space-1)", color: "var(--danger-fg)", marginTop: "var(--space-1)", fontWeight: "var(--weight-semibold)", overflowWrap: "anywhere" }}>
                    <Icon name="alertCircle" size={16} />
                    Error: {g.error}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
