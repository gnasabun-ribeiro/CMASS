import Icon from "./Icon.jsx";

export default function SubItemCard({ sub, index = 0, onNuevo, onRegistros }) {
  return (
    <div
      className="pop-in card-lift"
      style={{
        border: "var(--hairline) solid var(--card-border)",
        background: "var(--card-bg)",
        color: "var(--card-title)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        boxShadow: "var(--shadow-2)",
        animationDelay: `${index * 0.045}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span
          className="card-icon"
          style={{
            width: 48,
            height: 48,
            flex: "0 0 48px",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--card-accent-bg)",
            color: "var(--card-accent)",
            transition: "background .2s, color .2s",
          }}
        >
          <Icon name={sub.icon} size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="t-headline card-title" style={{ transition: "color .2s", overflowWrap: "anywhere" }}>
            {sub.title}
          </div>
          <div className="t-caption" style={{ color: "var(--card-desc)", marginTop: "var(--space-0-5)" }}>
            {sub.meta}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "auto" }}>
        <button
          type="button"
          className="btn btn--solid"
          style={{ flex: 1 }}
          onClick={(e) => e.detail <= 1 && onNuevo()} // un doble clic no navega dos veces
        >
          Nuevo
        </button>
        <button type="button" className="btn btn--strong" style={{ flex: 1 }} onClick={(e) => e.detail <= 1 && onRegistros()}>
          Registros
        </button>
      </div>
    </div>
  );
}
