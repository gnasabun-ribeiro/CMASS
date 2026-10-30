import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useConfirmacion } from "./Confirmacion.jsx";
import { sincronizar } from "../lib/sync.js";
import { useSync } from "../lib/useSync.js";
import { contarColaDe } from "../lib/localDb.js";
import { useNavegacion } from "../lib/navegacion.js";
import logoRibeiro from "../assets/logo-ribeiro.png";

// Navegación principal. Un solo <nav>: barra inferior en el celular; desde 768 px, riel o barra
// lateral con logo (se alterna con el botón de arriba; ver src/lib/navegacion.js y .app-nav).
export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, puede, rolListo, userId } = useAuth();
  const { pendientes } = useSync();
  const [confirmar, dialogo] = useConfirmacion();
  const [modoNav, alternarNav] = useNavegacion();

  // Antes de salir se intenta subir lo pendiente; si algo propio no llegó, se avisa.
  const salir = async () => {
    if (navigator.onLine) await sincronizar().catch(() => {});
    const pendientesPropios = await contarColaDe(userId).catch(() => 0);
    if (pendientesPropios > 0) {
      const ok = await confirmar({
        titulo: "Hay cambios sin enviar",
        mensaje:
          pendientesPropios === 1
            ? "Un cambio todavía no llegó al servidor: queda guardado en este dispositivo y se envía cuando vuelvas a entrar con tu usuario."
            : `${pendientesPropios} cambios todavía no llegaron al servidor: quedan guardados en este dispositivo y se envían cuando vuelvas a entrar con tu usuario.`,
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
    // El contador de cambios sin enviar (antes en el encabezado) va en su pestaña.
    { label: "Pendientes", icon: "refresh", active: isPendientes, onClick: () => navigate("/pendientes"), badge: pendientes },
    // Hoy Configuración solo tiene la gestión de usuarios: se muestra a quien puede usarla.
    ...(rolListo && puede("gestionarUsuarios")
      ? [{ label: "Configuración", icon: "settings", active: isConfig, onClick: () => navigate("/configuracion") }]
      : []),
  ];

  const item = (t) => (
    <button
      key={t.label}
      type="button"
      className="app-nav__item"
      aria-current={t.active ? "page" : undefined}
      aria-label={t.badge ? `${t.label}, ${t.badge} sin enviar` : undefined}
      onClick={t.onClick}
    >
      <span className="app-nav__icono">
        <Icon name={t.icon} size={20} />
      </span>
      <span className="app-nav__texto">{t.label}</span>
      {t.badge > 0 ? (
        <span className="badge app-nav__badge" aria-hidden="true">
          {t.badge > 99 ? "99+" : t.badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <nav className="app-nav" aria-label="Navegación principal">
      <div className="app-nav__marca">
        <span className="app-nav__logo">
          <img src={logoRibeiro} alt="" width={44} height={44} />
        </span>
        <span className="app-nav__nombre">
          <span className="t-headline" style={{ display: "block" }}>
            Inspecciones
          </span>
          <span className="t-caption" style={{ display: "block", color: "var(--text-tertiary)" }}>
            CMASS · Ribeiro
          </span>
        </span>
        {/* Desde 768 px: contraer a riel o expandir a barra lateral (se recuerda). */}
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm app-nav__alternar"
          aria-label={modoNav === "expandida" ? "Contraer menú" : "Expandir menú"}
          aria-expanded={modoNav === "expandida"}
          title={modoNav === "expandida" ? "Contraer menú" : "Expandir menú"}
          onClick={alternarNav}
        >
          <Icon name="back" size={16} style={{ transform: modoNav === "expandida" ? "none" : "rotate(180deg)" }} />
        </button>
      </div>
      {tabs.map(item)}
      <span className="app-nav__separador" />
      {item({ label: "Salir", icon: "logout", active: false, onClick: salir })}
      {dialogo}
    </nav>
  );
}
