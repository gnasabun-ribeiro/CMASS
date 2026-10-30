import Button from "./ui/Button.jsx";
import Notificaciones from "./Notificaciones.jsx";
import logoRibeiro from "../assets/logo-ribeiro.png";

// Encabezado fijo. Título y subtítulo pasan a dos líneas antes de cortarse con "…" (en un
// celular de 360 px "Inspecciones de Obra Pública" no entra en una). A la derecha, la campana
// de notificaciones; lo pendiente de enviar se ve en la pestaña Pendientes de la navegación.
export default function Header({ title, subtitle, onBack }) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        {onBack ? (
          <Button variant="strong" icon="back" aria-label="Volver" onClick={onBack} />
        ) : (
          <div className="app-header__logo">
            <img src={logoRibeiro} alt="Ribeiro" width={44} height={44} />
          </div>
        )}

        <div className="app-header__titulos">
          <h1 className="app-header__titulo clamp-2">{title}</h1>
          {subtitle ? <div className="app-header__subtitulo clamp-2">{subtitle}</div> : null}
        </div>

        <Notificaciones />
      </div>
    </header>
  );
}
