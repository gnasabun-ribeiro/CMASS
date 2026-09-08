import { useState } from "react";

const SEVERIDADES = [
  { value: "Crítico", bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
  { value: "Medio", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  { value: "Bajo", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
];

const fieldStyle = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 10,
  fontSize: 13.5,
  background: "#fff",
  color: "var(--ink)",
  minHeight: 42,
};

export default function PasoHallazgos({ hallazgos, onAgregar }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ titulo: "", severidad: "Medio", detalle: "", responsable: "", vence: "" });

  const guardar = () => {
    if (!form.titulo.trim()) return;
    const sev = SEVERIDADES.find((s) => s.value === form.severidad);
    onAgregar({
      titulo: form.titulo,
      severidad: form.severidad,
      sevBg: sev.bg,
      sevFg: sev.fg,
      detalle: form.detalle,
      responsable: form.responsable || "Sin asignar",
      vence: form.vence || "—",
    });
    setForm({ titulo: "", severidad: "Medio", detalle: "", responsable: "", vence: "" });
    setAbierto(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {hallazgos.map((h, i) => (
        <div
          key={`${h.titulo}-${i}`}
          className="pop-in"
          style={{
            borderRadius: 18,
            background: "#fff8fb",
            border: "1px solid #f7dce7",
            padding: 14,
            animationDelay: `${i * 0.045}s`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <span className="heading" style={{ fontWeight: 700, fontSize: 14.5 }}>
              {h.titulo}
            </span>
            <span style={{ background: h.sevBg, color: h.sevFg, fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 20 }}>
              {h.severidad}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted-4)", lineHeight: 1.5, marginBottom: 10 }}>{h.detalle}</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
            <span>
              Responsable: <strong style={{ color: "var(--ink)" }}>{h.responsable}</strong>
            </span>
            <span>
              Vence: <strong style={{ color: "var(--ink)" }}>{h.vence}</strong>
            </span>
          </div>
        </div>
      ))}

      {abierto ? (
        <div style={{ borderRadius: 18, border: "1.5px dashed var(--violet-400)", background: "var(--violet-25)", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <input
            placeholder="Título del hallazgo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            style={fieldStyle}
          />
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {SEVERIDADES.map((s) => (
              <button
                key={s.value}
                onClick={() => setForm({ ...form, severidad: s.value })}
                style={{
                  border: 0,
                  background: form.severidad === s.value ? s.bg : "#fff",
                  color: form.severidad === s.value ? s.fg : "var(--muted-4)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 13px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                {s.value}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            placeholder="Detalle…"
            value={form.detalle}
            onChange={(e) => setForm({ ...form, detalle: e.target.value })}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 9 }}>
            <input
              placeholder="Responsable"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              style={fieldStyle}
            />
            <input
              type="date"
              value={form.vence}
              onChange={(e) => setForm({ ...form, vence: e.target.value })}
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setAbierto(false)}
              style={{ flex: 1, border: 0, background: "var(--neutral-bg)", color: "var(--neutral-fg)", fontWeight: 700, fontSize: 13, padding: 11, borderRadius: 12, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              style={{ flex: 1, border: 0, background: "var(--violet-700)", color: "#fff", fontWeight: 700, fontSize: 13, padding: 11, borderRadius: 12, cursor: "pointer" }}
            >
              Guardar hallazgo
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          style={{
            border: "1.5px dashed var(--violet-400)",
            background: "var(--violet-25)",
            color: "var(--violet-800)",
            fontWeight: 700,
            fontSize: 13.5,
            padding: 15,
            borderRadius: 18,
            cursor: "pointer",
            minHeight: 52,
          }}
        >
          + Agregar hallazgo
        </button>
      )}
    </div>
  );
}
