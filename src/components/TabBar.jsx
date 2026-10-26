import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useConfirmacion } from "./Confirmacion.jsx";
import { sincronizar } from "../lib/sync.js";
import { contarColaDe } from "../lib/localDb.js";

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, puede, rolListo, userId } = useAuth();
  const [confirmar, dialogo] = useConfirmacion();

  // Antes de salir se intenta subir lo pendiente; si algo propio no llegó, se avisa.
  const salir = async () => {
    if (navigator.onLine) await sincronizar().catch(() => {});
    const pendientes = await contarColaDe(userId).catch(() => 0);
    if (pendientes > 0) {
      const ok = await confirmar({
        titulo: "Hay cambios sin enviar",
        mensaje:
          pendientes === 1
            ? "Un cambio todavía no llegó al servidor: queda guardado en este dispositivo y se envía cuando vuelvas a entrar con tu usuario."
            : `${pendientes} cambios todavía no llegaron al servidor: quedan guardados en este dispositivo y se envían cuando vuelvas a entrar con tu usuario.`,
        aceptar: "Salir igual",
      });
      if (!ok) return;
    }
    await logout();
    navigate("/login");
  };

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
      onClick: salir,
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
      {dialogo}
    </nav>
  );
}
