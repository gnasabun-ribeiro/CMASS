import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isForm = pathname.includes("/form/");
  const isPendientes = pathname.startsWith("/pendientes");
  const isLista = !isForm && (pathname === "/registros" || pathname.includes("/registros"));
  const isHome = !isForm && !isPendientes && !isLista;

  const tabs = [
    { label: "Inicio", icon: "home", active: isHome, onClick: () => navigate("/") },
    { label: "Registros", icon: "clipboard", active: isLista, onClick: () => navigate("/registros") },
    { label: "Pendientes", icon: "refresh", active: isPendientes, onClick: () => navigate("/pendientes") },
    {
      label: "Salir",
      icon: "users",
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
        padding: "8px 8px 12px",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.label}
          onClick={t.onClick}
          style={{
            flex: 1,
            border: 0,
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "5px 2px",
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
              height: 29,
              borderRadius: 14,
              background: t.active ? "var(--violet-150)" : "transparent",
              transition: "background .22s",
            }}
          >
            <Icon name={t.icon} size={20} strokeWidth={1.85} />
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
