import { useCallback, useEffect, useState } from "react";
import { ROLES } from "../../data/permisos.js";
import { actualizarUsuario, faltaMigracion, listarUsuarios, MENSAJE_MIGRACION } from "../../lib/panel.js";
import AltaUsuario from "./AltaUsuario.jsx";
import { Aviso, Chip, boton, campo, tarjeta } from "./ui.jsx";

export default function Usuarios({ userId }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [texto, setTexto] = useState("");
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(
    () =>
      listarUsuarios()
        .then(setUsuarios)
        .catch((e) => setError(faltaMigracion(e) ? MENSAJE_MIGRACION : e.message)),
    []
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = async (u, cambios) => {
    setGuardando(u.id);
    setError(null);
    try {
      await actualizarUsuario(u.id, cambios);
      setUsuarios((lista) => lista.map((x) => (x.id === u.id ? { ...x, ...cambios } : x)));
    } catch (e) {
      setError(e.message || "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  };

  if (!usuarios) return error ? <Aviso>{error}</Aviso> : <div style={{ color: "var(--violet-150)", fontSize: 13.5 }}>Cargando usuarios…</div>;

  const q = texto.trim().toLowerCase();
  const visibles = usuarios.filter((u) => !q || `${u.nombre} ${u.email}`.toLowerCase().includes(q));
  const admins = usuarios.filter((u) => u.rol === "administrador" && u.activo).length;

  return (
    <div>
      {agregando ? (
        <AltaUsuario usuarios={usuarios} onCreado={cargar} onCerrar={() => setAgregando(false)} />
      ) : (
        <button onClick={() => setAgregando(true)} style={{ ...boton(true), marginBottom: 12 }}>Agregar usuario</button>
      )}

      <input aria-label="Buscar usuario" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o correo" style={{ ...campo, width: "100%", marginBottom: 10 }} />
      <div style={{ fontSize: 12.5, color: "var(--violet-150)", marginBottom: 10, lineHeight: 1.5 }}>
        {ROLES.map((r) => <div key={r.value}><b>{r.label}:</b> {r.desc}</div>)}
      </div>
      {error ? <Aviso>{error}</Aviso> : null}
      <div style={{ display: "grid", gap: 8 }}>
        {visibles.map((u) => {
          const yo = u.id === userId;
          // No se puede dejar la app sin administradores ni cambiarse el rol uno mismo.
          const ultimoAdmin = u.rol === "administrador" && u.activo && admins <= 1;
          const bloqueado = guardando === u.id || yo;
          return (
            <div key={u.id} style={{ ...tarjeta, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: u.activo ? 1 : 0.6 }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" }}>
                  {u.nombre || "Sin nombre"} {yo ? <Chip bg="var(--violet-50)" fg="var(--violet-800)">Vos</Chip> : null}
                  {!u.activo ? <Chip bg="var(--neutral-bg)" fg="var(--neutral-fg)">De baja</Chip> : null}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--card-desc, var(--muted))", overflowWrap: "anywhere" }}>{u.email}</div>
              </div>
              <select
                aria-label={`Rol de ${u.nombre || u.email}`}
                value={u.rol}
                disabled={bloqueado || ultimoAdmin}
                onChange={(e) => cambiar(u, { rol: e.target.value })}
                style={campo}
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button
                onClick={() => cambiar(u, { activo: !u.activo })}
                disabled={bloqueado || (u.activo && ultimoAdmin)}
                style={{ ...campo, cursor: bloqueado ? "default" : "pointer", fontWeight: 700 }}
              >
                {u.activo ? "Dar de baja" : "Reactivar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
