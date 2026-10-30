import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/ui/Button.jsx";
import Banner from "../components/ui/Banner.jsx";
import { Field, Input } from "../components/ui/Field.jsx";
import logoRibeiro from "../assets/logo-ribeiro.png";

// Mensaje según el motivo: antes cualquier falla (sin conexión, demasiados intentos) decía
// "Correo o contraseña incorrectos".
function mensajeDeError(err) {
  if (!navigator.onLine || err.name === "AuthRetryableFetchError" || err.status === 0) return "No hay conexión. Revisá internet y probá de nuevo.";
  if (err.status === 429 || /rate limit/i.test(err.message)) return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  if (err.code === "email_not_confirmed") return "Tu correo todavía no está confirmado.";
  if (err.code === "invalid_credentials" || /invalid login credentials/i.test(err.message)) return "Correo o contraseña incorrectos.";
  if (err.code === "validation_failed" || /invalid format/i.test(err.message)) return "El correo no tiene un formato válido.";
  return `No se pudo completar: ${err.message}`;
}

// Pantallas sin marco (Login, Cambiar contraseña): centradas sobre el degradé, respetando
// las áreas seguras del celular (notch y barra de gestos).
export const pantallaSuelta = {
  minHeight: "100dvh",
  background: "var(--app-gradient)",
  display: "flex",
  flexDirection: "column",
  color: "var(--text-primary)",
  paddingTop: "env(safe-area-inset-top)",
  paddingLeft: "env(safe-area-inset-left)",
  paddingRight: "env(safe-area-inset-right)",
};

export default function Login() {
  const { login, resetPassword, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [resetEnviado, setResetEnviado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pass) {
      setError("Completá el correo y la contraseña."); // en vez del cartel del navegador
      return;
    }
    setError("");
    setEnviando(true);
    const { error: authError } = await login(email.trim(), pass);
    setEnviando(false);
    if (authError) {
      setError(mensajeDeError(authError));
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
    setEnviandoReset(true);
    const { error: resetError } = await resetPassword(email.trim());
    setEnviandoReset(false);
    if (resetError) {
      setError(mensajeDeError(resetError));
      return;
    }
    setResetEnviado(true);
  };

  // Con la sesión abierta no tiene sentido mostrar el formulario.
  if (!loading && isAuthenticated) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  return (
    <div className="sobre-fondo" style={pantallaSuelta}>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6) var(--space-5)" }}>
        <div className="pop-in" style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto var(--space-4)",
                borderRadius: "var(--radius-xl)",
                background: "#000",
                overflow: "hidden",
                boxShadow: "var(--shadow-logo)",
                animation: "pulseRing 2.6s ease-out infinite",
              }}
            >
              <img src={logoRibeiro} alt="Ribeiro" width={64} height={64} style={{ display: "block", objectFit: "contain" }} />
            </div>
            <h1 className="t-display" style={{ color: "var(--text-on-app)" }}>
              Inspecciones CMASS
            </h1>
            <p className="t-footnote" style={{ color: "var(--text-on-app-muted)", marginTop: "var(--space-1)" }}>
              Calidad · Medio Ambiente · Seguridad · Salud
            </p>
          </div>

          <form onSubmit={entrar} className="panel" style={{ display: "grid", gap: "var(--space-4)", boxShadow: "var(--shadow-4)", "--focus-color": "var(--violet-600)" }} noValidate>
            <h2 className="t-overline">Iniciar sesión</h2>

            <Field label="Correo electrónico">
              <Input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                size="lg"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetEnviado(false);
                }}
                placeholder="tecnico@empresa.com"
              />
            </Field>

            <div>
              <Field label="Contraseña">
                <Input type="password" autoComplete="current-password" required size="lg" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
              </Field>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-1)" }}>
                <Button variant="ghost" size="sm" onClick={olvideContrasena} loading={enviandoReset}>
                  Olvidé mi contraseña
                </Button>
              </div>
            </div>

            {resetEnviado ? <Banner tono="info">Te enviamos un enlace para restablecer la contraseña al correo indicado.</Banner> : null}
            {error ? (
              <Banner tono="danger" alerta>
                {error}
              </Banner>
            ) : null}

            <Button type="submit" variant="primary" size="lg" block loading={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </div>
      </main>
      {/* Atribución que pide la licencia gratuita de Flaticon por los íconos animados de Inicio. */}
      <footer
        className="t-caption"
        style={{ textAlign: "center", color: "var(--text-on-app-muted)", padding: "0 var(--space-5) calc(var(--space-4) + env(safe-area-inset-bottom))" }}
      >
        Íconos animados creados por{" "}
        <a href="https://www.flaticon.com/free-animated-icons" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          Magnific - Flaticon
        </a>
      </footer>
    </div>
  );
}
