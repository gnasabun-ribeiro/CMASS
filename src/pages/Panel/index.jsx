import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import Button from "../../components/ui/Button.jsx";
import { Skeleton } from "../../components/ui/EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { faltaMigracion, listarHallazgos, listarInspeccionesEnviadas, MENSAJE_MIGRACION } from "../../lib/panel.js";
import { hoyLocal } from "../../lib/fechas.js";
import Hallazgos from "./Hallazgos.jsx";
import Resumen from "./Resumen.jsx";
import { Aviso, tarjeta } from "./ui.jsx";

// Lugar reservado mientras carga (mismas proporciones que el Resumen: sin saltos al llegar).
function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el panel" style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...tarjeta, flex: "1 1 150px", display: "grid", gap: "var(--space-2)" }}>
            <Skeleton width={56} height={36} />
            <Skeleton width="70%" height={12} />
          </div>
        ))}
      </div>
      <div style={{ ...tarjeta, display: "grid", gap: "var(--space-3)" }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={14} />
        ))}
      </div>
    </div>
  );
}

export default function Panel() {
  const navigate = useNavigate();
  const { puede, rolListo, userId, nombre } = useAuth();
  const [tab, setTab] = useState("resumen");
  const [hallazgos, setHallazgos] = useState(null);
  const [inspecciones, setInspecciones] = useState([]);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    setActualizando(true);
    Promise.all([listarHallazgos(), listarInspeccionesEnviadas()])
      .then(([h, i]) => {
        setHallazgos(h);
        setInspecciones(i);
      })
      .catch((e) => {
        setHallazgos([]);
        setError(faltaMigracion(e) ? MENSAJE_MIGRACION : navigator.onLine ? e.message : "El panel necesita conexión.");
      })
      .finally(() => setActualizando(false));
  }, []);

  const autorizado = rolListo && puede("verPanel");
  useEffect(() => {
    if (autorizado) cargar();
  }, [autorizado, cargar]);

  // Evita mostrar "sin permiso" mientras todavía se está leyendo el rol.
  if (!rolListo) return <AppShell title="Panel de seguimiento" onBack={() => navigate("/")}>{null}</AppShell>;
  if (!autorizado) {
    return (
      <AppShell title="Panel de seguimiento" onBack={() => navigate("/")}>
        <Aviso>Tu rol no tiene acceso al panel.</Aviso>
      </AppShell>
    );
  }

  // Un hallazgo cerrado o reabierto se refleja al instante, sin volver a pedir todo.
  const alCambiar = (id, estado, extra) =>
    setHallazgos((lista) =>
      lista.map((h) =>
        h.id === id ? { ...h, estado, ...extra, vencido: estado === "abierto" && Boolean(h.vence) && h.vence < hoyLocal() } : h
      )
    );

  const pestanas = [
    { id: "resumen", label: "Resumen" },
    { id: "hallazgos", label: "Hallazgos" },
  ];

  // Los usuarios se administran desde la pestaña Configuración de la navegación.
  return (
    <AppShell title="Panel de seguimiento" subtitle="Hallazgos e inspecciones" onBack={() => navigate("/")}>
      <div className="sobre-fondo" style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", alignItems: "center" }}>
        <div role="tablist" aria-label="Secciones del panel" className="fila-pills" style={{ flex: 1 }}>
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-controls={`panel-${p.id}`}
              aria-selected={tab === p.id}
              tabIndex={tab === p.id ? 0 : -1}
              className="pill"
              onClick={() => setTab(p.id)}
              onKeyDown={(e) => {
                // Flechas entre pestañas (patrón ARIA tabs).
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = pestanas.findIndex((x) => x.id === tab);
                const otra = pestanas[(i + (e.key === "ArrowRight" ? 1 : pestanas.length - 1)) % pestanas.length];
                setTab(otra.id);
                document.getElementById(`tab-${otra.id}`)?.focus();
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="surface" size="sm" icon="refresh" loading={actualizando && hallazgos !== null} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {error ? <Aviso>{error}</Aviso> : null}
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {hallazgos === null ? <Cargando /> : null}
        {tab === "resumen" && hallazgos ? <Resumen hallazgos={hallazgos} inspecciones={inspecciones} /> : null}
        {tab === "hallazgos" && hallazgos ? (
          <Hallazgos hallazgos={hallazgos} puedeCerrar={puede("cerrarHallazgos")} userId={userId} userNombre={nombre} onCambio={alCambiar} />
        ) : null}
      </div>
    </AppShell>
  );
}
