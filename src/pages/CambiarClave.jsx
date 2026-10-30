import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/ui/Button.jsx";
import Banner from "../components/ui/Banner.jsx";
import { Field, Input } from "../components/ui/Field.jsx";
import { pantallaSuelta } from "./Login.jsx";

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
    <div className="sobre-fondo" style={{ ...pantallaSuelta, alignItems: "center", justifyContent: "center", padding: "var(--space-6) var(--space-5)" }}>
      <form
        onSubmit={guardar}
        noValidate
        className="pop-in panel"
        style={{ width: "100%", maxWidth: 420, display: "grid", gap: "var(--space-4)", boxShadow: "var(--shadow-4)", "--focus-color": "var(--violet-600)" }}
      >
        <div>
          <h1 className="t-title">Elegí tu contraseña</h1>
          <p className="t-callout" style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
            {debeCambiarClave ? `Ingresaste como ${email}. ` : ""}Por seguridad, reemplazá la contraseña temporal por una propia antes de seguir.
          </p>
        </div>

        <Field label="Contraseña nueva" hint={`Al menos ${MINIMO} caracteres.`}>
          <Input type="password" required autoComplete="new-password" size="lg" value={clave} onChange={(e) => setClave(e.target.value)} />
        </Field>
        <Field label="Repetila">
          <Input type="password" required autoComplete="new-password" size="lg" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </Field>

        {error ? (
          <Banner tono="danger" alerta>
            {error}
          </Banner>
        ) : null}

        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          <Button type="submit" variant="primary" size="lg" block loading={enviando}>
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </Button>
          <Button
            variant="ghost"
            block
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Salir
          </Button>
        </div>
      </form>
    </div>
  );
}
