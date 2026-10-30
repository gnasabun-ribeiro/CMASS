import Icon from "../Icon.jsx";

// Estado vacío / de error de una lista. `sobreFondo` cuando va directo sobre el degradé de la app.
//   <EmptyState icono="inbox" titulo="Todavía no hay registros" texto="..." accion={<Button>...</Button>} />
export default function EmptyState({ icono = "inbox", titulo, texto, accion, sobreFondo = false, compacto = false }) {
  return (
    <div className={`empty${sobreFondo ? " empty--sobre-fondo" : ""}`} style={compacto ? { padding: "var(--space-6) var(--space-4)" } : undefined}>
      <span className="empty__icono" aria-hidden="true">
        <Icon name={icono} size={24} />
      </span>
      {titulo ? <div className="empty__titulo">{titulo}</div> : null}
      {texto ? <div className="empty__texto">{texto}</div> : null}
      {accion ? <div className="empty__accion">{accion}</div> : null}
    </div>
  );
}

// Bloque gris animado que reserva el lugar del contenido mientras carga (sin saltos al llegar).
export function Skeleton({ width = "100%", height = 16, radius, style }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />;
}
