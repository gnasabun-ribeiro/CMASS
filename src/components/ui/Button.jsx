import { forwardRef } from "react";
import Icon from "../Icon.jsx";

// Botón del sistema (clases .btn de styles/componentes.css). Uso:
//   <Button variant="primary" size="lg" block onClick={...}>Siguiente</Button>
//   <Button variant="secondary" icon="download" loading={generando}>Descargar</Button>
//   <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" />   (solo ícono)
// variant: primary (CTA con degradé) | solid | secondary (por defecto) | strong | outline |
//          ghost | neutral | danger | danger-soft | warning | surface
// size: sm (36, 44 en táctil) | md (44) | lg (52). `loading` muestra un spinner, deshabilita
// y marca aria-busy. type es "button" salvo que se pase otro (en formularios: type="submit").
const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", block = false, icon, iconEnd, loading = false, className = "", children, disabled, type = "button", ...props },
  ref
) {
  const soloIcono = !children && (icon || loading);
  const clases = [
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    block && "btn--block",
    soloIcono && "btn--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const tamIcono = size === "lg" ? 20 : 16;

  return (
    <button ref={ref} type={type} className={clases} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={tamIcono} /> : null}
      {children}
      {iconEnd && !loading ? <Icon name={iconEnd} size={tamIcono} /> : null}
    </button>
  );
});

export default Button;
