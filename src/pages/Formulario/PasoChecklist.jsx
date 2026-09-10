import Icon from "../../components/Icon.jsx";
import { OPCIONES } from "../../data/checklist.js";

export default function PasoChecklist({ items, respuestas, onResponder }) {
  let categoriaAnterior = null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map(({ codigo, categoria, texto }, i) => {
        const nuevaCategoria = categoria !== categoriaAnterior;
        categoriaAnterior = categoria;

        return (
          <div key={codigo}>
            {nuevaCategoria ? (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--violet-800)",
                  fontWeight: 700,
                  margin: i === 0 ? "0 0 8px" : "16px 0 8px",
                }}
              >
                {categoria}
              </div>
            ) : null}
            <div
              className="pop-in"
              style={{
                borderRadius: 18,
                background: "var(--violet-tint-2)",
                border: "1px solid #f0e0f7",
                padding: 13,
                animationDelay: `${i * 0.045}s`,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 11 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--violet-800)",
                    background: "var(--violet-150)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    flex: "0 0 auto",
                  }}
                >
                  {codigo}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 500 }}>{texto}</span>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {OPCIONES.map((o) => {
                  const on = respuestas[codigo] === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => onResponder({ codigo, categoria, texto }, o.value)}
                      style={{
                        border: `1.5px solid ${on ? o.border : "var(--border)"}`,
                        background: on ? o.bg : "#fff",
                        color: on ? o.fg : "var(--muted-4)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: "10px 16px",
                        borderRadius: 14,
                        cursor: "pointer",
                        minHeight: 46,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
                <button
                  style={{
                    marginLeft: "auto",
                    border: "1.5px dashed var(--violet-300)",
                    background: "#fff",
                    color: "var(--violet-800)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: "10px 14px",
                    borderRadius: 14,
                    cursor: "pointer",
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="camera" size={16} strokeWidth={1.8} />
                  Foto
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
