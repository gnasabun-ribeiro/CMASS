import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import TabBar from "./TabBar.jsx";

export default function AppShell({ title, subtitle, onBack, padBottom = "108px", children }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Aviso de una acción que terminó en otra pantalla (ej. "Inspección enviada"): llega con
  // navigate(ruta, { state: { aviso } }) y se va al cerrarlo.
  const aviso = location.state?.aviso;
  const cerrarAviso = () => navigate(location.pathname + location.search, { replace: true, state: null });

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
      <Header title={title} subtitle={subtitle} onBack={onBack} />

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1020,
          margin: "0 auto",
          padding: "16px 14px",
          paddingBottom: `calc(${padBottom} + env(safe-area-inset-bottom))`, // la TabBar crece con el área segura
        }}
      >
        {aviso ? (
          <div
            role="status"
            style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--success-bg)", color: "var(--success-fg)", borderRadius: 16, padding: "10px 12px 10px 14px", marginBottom: 12, fontSize: 13.5, fontWeight: 700 }}
          >
            <span style={{ flex: 1 }}>{aviso}</span>
            <button onClick={cerrarAviso} aria-label="Cerrar aviso" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", minWidth: 36, minHeight: 36 }}>
              ×
            </button>
          </div>
        ) : null}
        <div className="app-screen">{children}</div>
      </div>

      <TabBar />
    </div>
  );
}
