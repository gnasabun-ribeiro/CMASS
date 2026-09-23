import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { OPCIONES } from "../../data/checklist.js";

function agruparPorCategoria(items) {
  const bloques = [];
  for (const item of items) {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.categoria === item.categoria) {
      ultimo.items.push(item);
    } else {
      bloques.push({ categoria: item.categoria, items: [item] });
    }
  }
  return bloques;
}

export default function PasoChecklist({ items, respuestas, onResponder }) {
  const bloques = useMemo(() => agruparPorCategoria(items), [items]);
  const [bloqueActual, setBloqueActual] = useState(0);
  const indice = Math.min(bloqueActual, bloques.length - 1);
  const bloque = bloques[indice];

  if (!bloque) return null;

  const esPrimero = indice === 0;
  const esUltimo = indice === bloques.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => setBloqueActual((b) => Math.max(0, b - 1))}
          disabled={esPrimero}
          aria-label="Categoría anterior"
          style={{
            width: 40,
            height: 40,
            flex: "0 0 40px",
            borderRadius: 14,
            border: 0,
            background: esPrimero ? "var(--violet-50)" : "var(--violet-150)",
            color: esPrimero ? "var(--muted)" : "var(--violet-800)",
            cursor: esPrimero ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="back" size={18} strokeWidth={2.1} />
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
            Página {indice + 1} de {bloques.length}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--violet-800)" }}>{bloque.categoria}</div>
        </div>

        <button
          onClick={() => setBloqueActual((b) => Math.min(bloques.length - 1, b + 1))}
          disabled={esUltimo}
          aria-label="Categoría siguiente"
          style={{
            width: 40,
            height: 40,
            flex: "0 0 40px",
            borderRadius: 14,
            border: 0,
            background: esUltimo ? "var(--violet-50)" : "var(--violet-150)",
            color: esUltimo ? "var(--muted)" : "var(--violet-800)",
            cursor: esUltimo ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="back" size={18} strokeWidth={2.1} />
          </span>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {bloque.items.map(({ codigo, categoria, texto }, i) => (
          <div
            key={codigo}
            className="pop-in"
            style={{
              borderRadius: 18,
              background: "var(--violet-tint-2)",
              border: "1px solid var(--border)",
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
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, overflowX: "auto", justifyContent: "center", paddingBottom: 2 }}>
        {bloques.map((b, i) => {
          const respondidas = b.items.filter((it) => respuestas[it.codigo] != null).length;
          const completo = respondidas === b.items.length;
          const on = i === indice;
          return (
            <button
              key={b.categoria}
              onClick={() => setBloqueActual(i)}
              aria-label={`${b.categoria} (${respondidas}/${b.items.length})`}
              title={b.categoria}
              style={{
                flex: "0 0 auto",
                width: 40,
                height: 40,
                border: 0,
                background: on ? "var(--active-bg)" : completo ? "var(--violet-150)" : "var(--violet-50)",
                color: on ? "var(--on-active)" : completo ? "var(--violet-800)" : "var(--muted)",
                borderRadius: 14,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
