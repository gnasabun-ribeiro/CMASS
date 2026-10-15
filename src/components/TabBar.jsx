import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, puede, rolListo } = useAuth();

  const isForm = pathname.includes("/form/");
  const isPendientes = pathname.startsWith("/pendientes");
  const isConfig = pathname.startsWith("/configuracion");
  const isLista = !isForm && (pathname === "/registros" || pathname.includes("/registros"));
  const isHome = !isForm && !isPendientes && !isLista && !isConfig;

  const tabs = [
    { label: "Inicio", icon: "home", active: isHome, onClick: () => navigate("/") },
    { label: "Registros", icon: "clipboard", active: isLista, onClick: () => navigate("/registros") },
    { label: "Pendientes", icon: "refresh", active: isPendientes, onClick: () => navigate("/pendientes") },
    // Hoy Configuración solo tiene la gestión de usuarios: se muestra a quien puede usarla.
    ...(rolListo && puede("gestionarUsuarios")
      ? [{ label: "Configuración", icon: "settings", active: isConfig, onClick: () => navigate("/configuracion") }]
      : []),
    {
      label: "Salir",
      icon: "logout",
      active: false,
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: "rgba(255,255,255,.96)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        padding: "8px 6px 12px",
        // Celulares con barra de gestos (PWA instalada): la barra no queda debajo del indicador.
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.label}
          onClick={t.onClick}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            border: 0,
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "5px 0",
            cursor: "pointer",
            color: t.active ? "var(--violet-700)" : "var(--muted-2)",
            minHeight: 50,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 46,
              maxWidth: "100%",
              height: 29,
              borderRadius: 14,
              background: t.active ? "var(--violet-150)" : "transparent",
              transition: "background .22s",
            }}
          >
            <Icon name={t.icon} size={20} strokeWidth={1.85} />
          </span>
          {/* Con 5 pestañas en 360 px "Configuración" entra justo; en pantallas más angostas se corta con "…" en vez de pisar a las vecinas. */}
          <span style={{ fontSize: 10.5, fontWeight: 700, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
