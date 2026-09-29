import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { OPCIONES, agruparPorCategoria } from "../../data/checklist.js";

export default function PasoChecklist({ items, respuestas, onResponder, fotos = {}, subiendo = {}, puedeFotos = false, onFoto, onQuitarFoto }) {
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
              <BotonFoto
                habilitado={puedeFotos && respuestas[codigo] != null && !subiendo[codigo]}
                motivo={!puedeFotos ? "Las fotos se guardan solo en Obra Pública" : respuestas[codigo] == null ? "Respondé el ítem para adjuntar una foto" : ""}
                subiendo={Boolean(subiendo[codigo])}
                tiene={Boolean(fotos[codigo])}
                onArchivo={(file) => onFoto({ codigo, categoria, texto }, file)}
              />
            </div>
            {fotos[codigo] ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
                <a href={fotos[codigo]} target="_blank" rel="noreferrer">
                  <img src={fotos[codigo]} alt={`Foto del ítem ${codigo}`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)", display: "block" }} />
                </a>
                <button
                  onClick={() => onQuitarFoto({ codigo })}
                  disabled={Boolean(subiendo[codigo])}
                  style={{ border: 0, background: "var(--danger-bg)", color: "var(--danger-fg)", fontWeight: 700, fontSize: 12, padding: "8px 13px", borderRadius: 10, cursor: "pointer" }}
                >
                  Quitar foto
                </button>
              </div>
            ) : null}
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

function BotonFoto({ habilitado, motivo, subiendo, tiene, onArchivo }) {
  const estilo = {
    marginLeft: "auto",
    border: "1.5px dashed var(--violet-300)",
    background: "#fff",
    color: "var(--violet-800)",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "10px 14px",
    borderRadius: 14,
    cursor: habilitado ? "pointer" : "not-allowed",
    opacity: habilitado ? 1 : 0.5,
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
  const contenido = (
    <>
      <Icon name="camera" size={16} strokeWidth={1.8} />
      {subiendo ? "Subiendo…" : tiene ? "Cambiar foto" : "Foto"}
    </>
  );
  if (!habilitado) {
    return (
      <button disabled title={motivo} style={estilo}>
        {contenido}
      </button>
    );
  }
  return (
    <label style={estilo}>
      {contenido}
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onArchivo(file);
        }}
      />
    </label>
  );
}
