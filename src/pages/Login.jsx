import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [resetEnviado, setResetEnviado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pass) return;
    setError("");
    setEnviando(true);
    const { error: authError } = await login(email.trim(), pass);
    setEnviando(false);
    if (authError) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    const from = location.state?.from?.pathname || "/";
    navigate(from, { replace: true });
  };

  const olvideContrasena = async () => {
    if (!email.trim()) {
      setError("Ingresá tu correo para enviarte el enlace de recuperación.");
      return;
    }
    setError("");
    await resetPassword(email.trim());
    setResetEnviado(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-gradient)",
        display: "flex",
        flexDirection: "column",
        color: "var(--ink)",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <div className="pop-in" style={{ width: "100%", maxWidth: 430 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div
              style={{
                width: 66,
                height: 66,
                margin: "0 auto 14px",
                borderRadius: 21,
                background: "var(--brand-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-logo)",
                animation: "pulseRing 2.6s ease-out infinite",
              }}
            >
              <Icon name="logo" size={31} strokeWidth={1.6} color="var(--violet-150)" />
            </div>
            <div
              className="heading"
              style={{
                fontWeight: 800,
                fontSize: 27,
                letterSpacing: "-.6px",
                lineHeight: 1.15,
                color: "#fff",
              }}
            >
              Inspecciones CMASS
            </div>
            <div style={{ fontSize: 13, color: "var(--violet-150)", marginTop: 4 }}>
              Calidad · Ambiente · Seguridad · Sistemas
            </div>
          </div>

          <form
            onSubmit={entrar}
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 18,
              boxShadow: "0 22px 50px -26px rgba(36,18,70,.45)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--muted)",
                fontWeight: 600,
                marginBottom: 11,
              }}
            >
              Iniciar sesión
            </div>

            <label style={{ display: "block", marginBottom: 11 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-3)", marginBottom: 6 }}>
                Correo electrónico
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetEnviado(false);
                }}
                placeholder="tecnico@empresa.com"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "block", marginBottom: 9 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-3)", marginBottom: 6 }}>
                Contraseña
              </span>
              <input
                type="password"
                required
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button
                type="button"
                onClick={olvideContrasena}
                style={{
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                  border: 0,
                  background: "transparent",
                  color: "var(--violet-800)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "8px 4px",
                  cursor: "pointer",
                  minHeight: 40,
                }}
              >
                Olvidé mi contraseña
              </button>
            </div>

            {resetEnviado ? (
              <div
                style={{
                  background: "var(--violet-75)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--muted-3)",
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                Te enviamos un enlace para restablecer la contraseña al correo indicado.
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  background: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 12.5,
                  color: "var(--danger-fg)",
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={enviando}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 16,
                background: "var(--cta-gradient)",
                color: "var(--on-cta)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                padding: 15,
                cursor: enviando ? "default" : "pointer",
                opacity: enviando ? 0.7 : 1,
                minHeight: 54,
                boxShadow: "var(--shadow-cta)",
              }}
            >
              {enviando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1.5px solid var(--border)",
  borderRadius: 16,
  padding: 15,
  fontSize: 16,
  background: "var(--violet-25)",
  minHeight: 56,
  outline: "none",
  color: "var(--ink)",
};
