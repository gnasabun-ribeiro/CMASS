import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { faltaMigracion, listarHallazgos, listarInspeccionesEnviadas, MENSAJE_MIGRACION } from "../../lib/panel.js";
import Hallazgos from "./Hallazgos.jsx";
import Resumen from "./Resumen.jsx";
import Usuarios from "./Usuarios.jsx";
import { Aviso, boton } from "./ui.jsx";

export default function Panel() {
  const navigate = useNavigate();
  const { puede, rolListo, userId } = useAuth();
  const [tab, setTab] = useState("resumen");
  const [hallazgos, setHallazgos] = useState(null);
  const [inspecciones, setInspecciones] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    Promise.all([listarHallazgos(), listarInspeccionesEnviadas()])
      .then(([h, i]) => {
        setHallazgos(h);
        setInspecciones(i);
      })
      .catch((e) => {
        setHallazgos([]);
        setError(faltaMigracion(e) ? MENSAJE_MIGRACION : navigator.onLine ? e.message : "El panel necesita conexión.");
      });
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
        h.id === id ? { ...h, estado, ...extra, vencido: estado === "abierto" && Boolean(h.vence) && h.vence < new Date().toISOString().slice(0, 10) } : h
      )
    );

  const pestanas = [
    { id: "resumen", label: "Resumen" },
    { id: "hallazgos", label: "Hallazgos" },
    ...(puede("gestionarUsuarios") ? [{ id: "usuarios", label: "Usuarios" }] : []),
  ];

  return (
    <AppShell title="Panel de seguimiento" subtitle="Hallazgos, inspecciones y usuarios" onBack={() => navigate("/")}>
      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {pestanas.map((p) => (
          <button key={p.id} role="tab" aria-selected={tab === p.id} onClick={() => setTab(p.id)} style={boton(tab === p.id)}>
            {p.label}
          </button>
        ))}
        {tab !== "usuarios" ? (
          <button onClick={cargar} style={{ ...boton(false), marginLeft: "auto" }}>Actualizar</button>
        ) : null}
      </div>

      {error && tab !== "usuarios" ? <Aviso>{error}</Aviso> : null}
      {tab !== "usuarios" && hallazgos === null ? <div style={{ color: "var(--violet-150)", fontSize: 13.5 }}>Cargando…</div> : null}
      {tab === "resumen" && hallazgos ? <Resumen hallazgos={hallazgos} inspecciones={inspecciones} /> : null}
      {tab === "hallazgos" && hallazgos ? <Hallazgos hallazgos={hallazgos} puedeCerrar={puede("cerrarHallazgos")} userId={userId} onCambio={alCambiar} /> : null}
      {tab === "usuarios" && puede("gestionarUsuarios") ? <Usuarios userId={userId} /> : null}
    </AppShell>
  );
}
