import Icon from "./Icon.jsx";

export default function ModuleCard({ modulo, index = 0, onOpen, onRegistros }) {
  const hasList = Boolean(modulo.form);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="pop-in"
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
        border: 0,
        borderRadius: 24,
        background: "#fff",
        color: "var(--ink)",
        padding: 17,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 186,
        boxShadow: "var(--shadow-card)",
        animationDelay: `${index * 0.045}s`,
      }}
    >
      <span
        style={{
          position: "absolute",
          right: -34,
          top: -34,
          width: 126,
          height: 126,
          borderRadius: "50%",
          background: "rgba(112,28,147,.09)",
        }}
      />
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--violet-50)",
            color: "var(--violet-800)",
            boxShadow: "0 8px 18px -10px rgba(36,18,70,.5)",
          }}
        >
          <Icon name={modulo.icon} size={27} strokeWidth={1.55} />
        </span>
        {modulo.badge ? (
          <span
            style={{
              background: "var(--violet-50)",
              color: "var(--violet-800)",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 20,
              padding: "4px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {modulo.badge}
          </span>
        ) : null}
      </span>

      <span style={{ position: "relative", flex: 1, display: "block" }}>
        <span
          className="heading"
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: 17,
            lineHeight: 1.2,
            letterSpacing: "-.35px",
          }}
        >
          {modulo.title}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12.5,
            color: "#5c5570",
            lineHeight: 1.45,
            marginTop: 5,
          }}
        >
          {modulo.desc}
        </span>
      </span>

      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 9,
          color: "var(--violet-800)",
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, whiteSpace: "nowrap" }}>
          {modulo.cta}
          <Icon name="arrowRight" size={15} strokeWidth={2.2} />
        </span>
        {hasList ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegistros();
            }}
            style={{
              border: 0,
              background: "var(--violet-50)",
              color: "var(--violet-800)",
              fontSize: 11.5,
              fontWeight: 700,
              padding: "9px 13px",
              borderRadius: 12,
              cursor: "pointer",
              minHeight: 40,
            }}
          >
            Registros
          </button>
        ) : null}
      </span>
    </div>
  );
}
