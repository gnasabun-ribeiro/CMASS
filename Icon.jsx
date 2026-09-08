import Icon from "./Icon.jsx";

export default function SubItemCard({ sub, index = 0, onNuevo, onRegistros }) {
  return (
    <div
      className="pop-in"
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: 15,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "var(--shadow-panel)",
        animationDelay: `${index * 0.045}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 46,
            height: 46,
            flex: "0 0 46px",
            borderRadius: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--violet-50)",
            color: "var(--violet-800)",
          }}
        >
          <Icon name={sub.icon} size={23} strokeWidth={1.6} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="heading" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, letterSpacing: "-.2px" }}>
            {sub.title}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{sub.meta}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button
          onClick={onNuevo}
          style={{
            flex: 1,
            border: 0,
            background: "var(--violet-700)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            padding: 12,
            borderRadius: 14,
            cursor: "pointer",
            minHeight: 48,
          }}
        >
          Nuevo
        </button>
        <button
          onClick={onRegistros}
          style={{
            flex: 1,
            border: 0,
            background: "var(--violet-100)",
            color: "var(--violet-800)",
            fontSize: 13,
            fontWeight: 700,
            padding: 12,
            borderRadius: 14,
            cursor: "pointer",
            minHeight: 48,
          }}
        >
          Registros
        </button>
      </div>
    </div>
  );
}
