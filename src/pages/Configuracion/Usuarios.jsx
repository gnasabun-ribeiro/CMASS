import { useCallback, useEffect, useState } from "react";
import { ROLES } from "../../data/permisos.js";
import { actualizarUsuario, faltaMigracion, listarUsuarios, MENSAJE_MIGRACION } from "../../lib/panel.js";
import AltaUsuario from "./AltaUsuario.jsx";
import { useConfirmacion } from "../../components/Confirmacion.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState, { Skeleton } from "../../components/ui/EmptyState.jsx";
import { Input } from "../../components/ui/Field.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { toast } from "../../components/ui/Toast.jsx";
import { normalizar } from "../../lib/texto.js";
import { Aviso, tarjeta, textoTarjeta } from "../Panel/ui.jsx";

const OPCIONES_ROL = ROLES.map((r) => ({ value: r.value, label: r.label, description: r.desc }));

export default function Usuarios({ userId }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [texto, setTexto] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [confirmar, dialogo] = useConfirmacion();

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

  const nombreRol = (rol) => ROLES.find((r) => r.value === rol)?.label || rol;
  const quien = (u) => u.nombre || u.email;

  const cambiar = async (u, cambios, exito) => {
    setGuardando(u.id);
    try {
      await actualizarUsuario(u.id, cambios);
      setUsuarios((lista) => lista.map((x) => (x.id === u.id ? { ...x, ...cambios } : x)));
      toast.success(exito);
    } catch (e) {
      toast.error("No se pudo guardar", { descripcion: e.message });
    } finally {
      setGuardando(null);
    }
  };

  const cambiarRol = async (u, rol) => {
    const ok = await confirmar({
      titulo: `¿Cambiar el rol de ${quien(u)}?`,
      mensaje: `Pasa de ${nombreRol(u.rol)} a ${nombreRol(rol)}.`,
      aceptar: "Cambiar rol",
      peligro: false,
    });
    if (ok) cambiar(u, { rol }, `${quien(u)} ahora es ${nombreRol(rol)}`);
  };

  const cambiarBaja = async (u) => {
    if (u.activo) {
      const ok = await confirmar({
        titulo: `¿Dar de baja a ${quien(u)}?`,
        mensaje: "No va a poder entrar a la app. Sus inspecciones quedan guardadas y se puede reactivar después.",
        aceptar: "Dar de baja",
      });
      if (!ok) return;
    }
    cambiar(u, { activo: !u.activo }, u.activo ? `${quien(u)} quedó dado de baja` : `${quien(u)} se reactivó`);
  };

  if (!usuarios) {
    if (error) return <Aviso>{error}</Aviso>;
    return (
      <div aria-busy="true" aria-label="Cargando usuarios" style={{ display: "grid", gap: "var(--space-2)" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...tarjeta, display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <div style={{ flex: 1, display: "grid", gap: "var(--space-2)" }}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="60%" height={12} />
            </div>
            <Skeleton width={140} height={36} />
          </div>
        ))}
      </div>
    );
  }

  const q = normalizar(texto);
  const visibles = usuarios.filter((u) => !q || normalizar(`${u.nombre} ${u.email}`).includes(q));
  const admins = usuarios.filter((u) => u.rol === "administrador" && u.activo).length;

  return (
    <div>
      {agregando ? (
        <AltaUsuario usuarios={usuarios} onCreado={cargar} onCerrar={() => setAgregando(false)} />
      ) : (
        <Button variant="solid" icon="users" onClick={() => setAgregando(true)} style={{ marginBottom: "var(--space-3)" }}>
          Agregar usuario
        </Button>
      )}

      <Input
        type="search"
        inputMode="search"
        aria-label="Buscar usuario"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nombre o correo"
        style={{ marginBottom: "var(--space-3)", background: "var(--surface)" }}
      />
      <details className="t-footnote" style={{ color: "var(--text-on-app-muted)", marginBottom: "var(--space-3)" }}>
        <summary style={{ cursor: "pointer", fontWeight: "var(--weight-semibold)", minHeight: "var(--touch-min)", display: "flex", alignItems: "center" }}>
          Qué puede hacer cada rol
        </summary>
        <div style={{ display: "grid", gap: "var(--space-1)", paddingTop: "var(--space-1)" }}>
          {ROLES.map((r) => (
            <div key={r.value}>
              <b>{r.label}:</b> {r.desc}
            </div>
          ))}
        </div>
      </details>
      {error ? <Aviso>{error}</Aviso> : null}
      {visibles.length === 0 ? <EmptyState sobreFondo icono="search" titulo="Nadie coincide con la búsqueda" texto="Probá con otro nombre o correo." compacto /> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
        {visibles.map((u) => {
          const yo = u.id === userId;
          // No se puede dejar la app sin administradores ni cambiarse el rol uno mismo.
          const ultimoAdmin = u.rol === "administrador" && u.activo && admins <= 1;
          const bloqueado = guardando === u.id || yo;
          const sinRol = bloqueado || ultimoAdmin;
          const sinBaja = bloqueado || (u.activo && ultimoAdmin);
          // Por qué no se puede (se ve al pasar el mouse y debajo, en el celular).
          const motivo = yo ? "No podés cambiar tu propio rol ni darte de baja" : ultimoAdmin ? "Tiene que quedar al menos un administrador activo" : undefined;
          return (
            <li key={u.id} style={{ ...tarjeta, display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", opacity: u.activo ? 1 : 0.65 }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div className="t-callout" style={{ fontWeight: "var(--weight-bold)", overflowWrap: "anywhere", display: "flex", gap: "var(--space-1-5)", flexWrap: "wrap", alignItems: "center" }}>
                  {u.nombre || "Sin nombre"}
                  {yo ? <span className="chip chip--accent">Vos</span> : null}
                  {!u.activo ? <span className="chip">De baja</span> : null}
                </div>
                <div className="t-footnote" style={{ ...textoTarjeta, overflowWrap: "anywhere" }}>
                  {u.email}
                </div>
                {motivo && (sinRol || sinBaja) ? (
                  <div className="t-caption" style={{ ...textoTarjeta, marginTop: "var(--space-1)" }}>
                    {motivo}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", flex: "1 1 260px", justifyContent: "flex-end" }}>
                <Select
                  aria-label={`Rol de ${u.nombre || u.email}`}
                  titulo={`Rol de ${u.nombre || u.email}`}
                  size="sm"
                  options={OPCIONES_ROL}
                  value={u.rol}
                  disabled={sinRol}
                  onChange={(rol) => cambiarRol(u, rol)}
                  style={{ flex: "1 1 150px", width: "auto", maxWidth: 220 }}
                />
                <Button size="sm" variant={u.activo ? "danger-soft" : "secondary"} disabled={sinBaja} loading={guardando === u.id} title={sinBaja ? motivo : undefined} onClick={() => cambiarBaja(u)}>
                  {u.activo ? "Dar de baja" : "Reactivar"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {dialogo}
    </div>
  );
}
