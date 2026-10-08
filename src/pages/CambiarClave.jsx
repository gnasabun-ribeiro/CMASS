import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const MINIMO = 8;

// Se muestra sola al primer ingreso con la contraseña temporal que da el administrador, o
// al volver por el enlace de "Olvidé mi contraseña" (ver ProtectedRoute).
export default function CambiarClave() {
  const { cambiarClave, debeCambiarClave, logout, email } = useAuth();
  const navigate = useNavigate();
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (clave.length < MINIMO) return setError(`La contraseña tiene que tener al menos ${MINIMO} caracteres.`);
    if (clave !== repetida) return setError("Las contraseñas no coinciden.");
    setError("");
    setEnviando(true);
    const { error: errorAuth } = await cambiarClave(clave);
    setEnviando(false);
    if (errorAuth) return setError(errorAuth.message || "No se pudo cambiar la contraseña.");
    navigate("/", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-gradient)", display: "flex", alignItems: "center", justifyContent: "center", padding: 22, color: "var(--ink)" }}>
      <form onSubmit={guardar} className="pop-in" style={{ width: "100%", maxWidth: 430, background: "var(--card-bg, #fff)", color: "var(--card-title, var(--ink))", borderRadius: 24, padding: 22, boxShadow: "var(--shadow-panel)" }}>
        <h1 className="heading" style={{ fontSize: 20, margin: "0 0 6px" }}>Elegí tu contraseña</h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 16px", color: "var(--card-desc, var(--muted))" }}>
          {debeCambiarClave ? `Ingresaste como ${email}. ` : ""}Por seguridad, reemplazá la contraseña temporal por una propia antes de seguir.
        </p>

        <label style={{ display: "block", marginBottom: 11 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Contraseña nueva</span>
          <input type="password" required autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Repetila</span>
          <input type="password" required autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} style={inputStyle} />
        </label>

        {error ? (
          <div role="alert" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 14, padding: 12, fontSize: 12.5, color: "var(--danger-fg)", lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          style={{ width: "100%", border: 0, borderRadius: 16, background: "var(--cta-gradient)", color: "var(--on-cta)", fontWeight: 700, fontSize: 15, padding: 15, cursor: enviando ? "default" : "pointer", opacity: enviando ? 0.7 : 1, minHeight: 54, boxShadow: "var(--shadow-cta)" }}
        >
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          style={{ display: "block", margin: "12px auto 0", border: 0, background: "transparent", color: "var(--card-desc, var(--muted))", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 8 }}
        >
          Salir
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1.5px solid var(--border)",
  borderRadius: 16,
  padding: 15,
  fontSize: 16,
  background: "var(--violet-25)",
  minHeight: 56,
  outline: "none",
  color: "var(--ink)",
};
