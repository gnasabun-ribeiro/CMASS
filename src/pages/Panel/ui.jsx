// Piezas visuales compartidas por las pestañas del panel (mismas variables CSS que el resto de la app).
export const tarjeta = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--card-border, transparent)",
  borderRadius: 18,
  padding: "14px 16px",
  boxShadow: "0 10px 22px -20px rgba(36,18,70,.5)",
};

export function Cifra({ valor, etiqueta, color }) {
  return (
    <div style={{ ...tarjeta, flex: "1 1 140px" }}>
      <div className="heading" style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.1, color: color || "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>{etiqueta}</div>
    </div>
  );
}

export function Titulo({ children }) {
  return (
    <h2 className="heading" style={{ fontSize: 15, fontWeight: 800, margin: "20px 2px 10px", color: "var(--ink)" }}>
      {children}
    </h2>
  );
}

// Barra de proporción: `parte` sobre `maximo`.
export function Barra({ parte, maximo, color = "var(--violet-700)" }) {
  const pct = maximo > 0 ? Math.max(parte > 0 ? 3 : 0, (parte / maximo) * 100) : 0;
  return (
    <div style={{ height: 8, borderRadius: 4, background: "var(--violet-50)", overflow: "hidden", flex: 1, minWidth: 60 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

export function Chip({ children, bg, fg }) {
  return (
    <span style={{ background: bg, color: fg, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export const boton = (activo) => ({
  border: 0,
  background: activo ? "var(--active-bg)" : "var(--violet-50)",
  color: activo ? "var(--on-active)" : "var(--violet-800)",
  fontSize: 12.5,
  fontWeight: 700,
  padding: "8px 14px",
  borderRadius: 20,
  cursor: "pointer",
  minHeight: 38,
});

export const campo = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--ink)",
  background: "#fff",
  minHeight: 38,
};

export function Aviso({ children, tipo = "error" }) {
  const c = tipo === "error" ? { bg: "var(--danger-bg)", fg: "var(--danger-fg)" } : { bg: "var(--warn-bg)", fg: "var(--warn-fg)" };
  return (
    <div role="alert" style={{ background: c.bg, color: c.fg, borderRadius: 14, padding: "11px 14px", fontSize: 13, fontWeight: 600, margin: "10px 0" }}>
      {children}
    </div>
  );
}
