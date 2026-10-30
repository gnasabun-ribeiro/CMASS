import Icon from "../Icon.jsx";

const ICONO = { info: "info", success: "checkCircle", warning: "alert", danger: "alertCircle", neutral: "info" };

// Aviso en línea que describe el estado de la pantalla (solo lectura, sin conexión, falta un
// dato). Para el resultado de una acción (guardado, enviado, error al guardar) se usa un toast.
//   <Banner tono="warning" titulo="Sin conexión" accion={<Button size="sm">Reintentar</Button>}>
//     Lo que cargues se guarda en el dispositivo.
//   </Banner>
// tono: info | success | warning | danger | neutral. `alerta` lo anuncia al aparecer (role="alert").
export default function Banner({ tono = "info", titulo, children, accion, icono, alerta = false, className = "", style }) {
  return (
    <div className={`banner banner--${tono} ${className}`} role={alerta ? "alert" : undefined} style={style}>
      <span className="banner__icono">
        <Icon name={icono || ICONO[tono]} size={18} />
      </span>
      <div className="banner__cuerpo">
        {titulo ? <div className="banner__titulo">{titulo}</div> : null}
        {children}
      </div>
      {accion ? <div className="banner__accion">{accion}</div> : null}
    </div>
  );
}
