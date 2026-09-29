import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { listarCola, obtenerInspeccion } from "../lib/localDb.js";
import { sincronizar } from "../lib/sync.js";
import { useSync } from "../lib/useSync.js";

const ETIQUETA_TIPO = {
  crear: "creación",
  generales: "datos generales",
  respuesta: "respuestas del checklist",
  hallazgo: "hallazgos",
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
        lista.push({
          id,
          titulo: `Inspección de Obra — ${rec?.generales?.cliente || "Sin cliente"}`,
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

  return (
    <AppShell title="Pendientes" subtitle={subtitulo} onBack={() => navigate("/")}>
      <div
        style={{
          borderRadius: 24,
          padding: 17,
          background: "var(--brand-gradient)",
          color: "var(--violet-150)",
          display: "flex",
          gap: 13,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 15,
          boxShadow: "0 20px 40px -24px rgba(36,18,70,.8)",
        }}
      >
        <div style={{ flex: 1, minWidth: 190 }}>
          <div className="heading" style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-.3px" }}>
            {sync.pendientes === 0 ? "Sin registros pendientes" : `${sync.pendientes} cambios sin sincronizar`}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--violet-150)", marginTop: 3 }}>
            {estadoConexion}
            {sync.ultimaSync ? ` · Última sincronización: ${formatoHora(sync.ultimaSync)}` : ""}
          </div>
        </div>
        <button
          onClick={sincronizar}
          disabled={botonInactivo}
          style={{
            border: 0,
            background: "var(--violet-400)",
            color: "var(--ink)",
            fontWeight: 800,
            fontSize: 13.5,
            padding: "14px 20px",
            borderRadius: 16,
            cursor: botonInactivo ? "not-allowed" : "pointer",
            opacity: botonInactivo ? 0.55 : 1,
            minHeight: 50,
          }}
        >
          {sync.sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      </div>

      {grupos.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--violet-150)", padding: "24px 0", fontSize: 13.5 }}>No hay nada por enviar.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {grupos.map((g) => (
            <button
              key={g.id}
              onClick={() => navigate(`/form/obra?id=${g.id}`)}
              style={{
                textAlign: "left",
                border: 0,
                background: "#fff",
                borderRadius: 18,
                padding: "13px 15px",
                cursor: "pointer",
                boxShadow: "0 10px 22px -20px rgba(36,18,70,.5)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{g.titulo}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{g.detalle || "Pendiente de creación"}</div>
              {g.error ? <div style={{ fontSize: 11.5, color: "var(--danger-fg)", marginTop: 4, fontWeight: 600 }}>Error: {g.error}</div> : null}
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
