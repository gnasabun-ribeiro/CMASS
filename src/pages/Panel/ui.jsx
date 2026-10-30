import Banner from "../../components/ui/Banner.jsx";

// Piezas visuales compartidas por las pestañas del panel y por Configuración (mismos tokens que
// el resto de la app). Las tarjetas usan las variables de card: en el tema Ribeiro son oscuras.
export const tarjeta = {
  background: "var(--card-bg)",
  border: "var(--hairline) solid var(--card-border)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-4)",
  boxShadow: "var(--shadow-1)",
  color: "var(--card-title)",
};

export const textoTarjeta = { color: "var(--card-desc)" };

// `tono` (warning | success | danger) pinta el número con los colores semánticos, que no cambian
// entre temas y por eso van sobre su propio fondo, legible tanto en tarjeta clara como oscura.
export function Cifra({ valor, etiqueta, tono }) {
  const chip = tono ? { background: `var(--${tono === "warning" ? "warn" : tono}-bg)`, color: `var(--${tono === "warning" ? "warn" : tono}-fg)`, borderRadius: "var(--radius-md)", padding: "0 var(--space-3)" } : null;
  return (
    <div style={{ ...tarjeta, flex: "1 1 150px" }}>
      <div className="heading tabular" style={{ display: "inline-block", fontWeight: "var(--weight-heavy)", fontSize: "var(--text-display)", lineHeight: 1.25, ...chip }}>
        {valor}
      </div>
      <div className="t-footnote" style={{ ...textoTarjeta, marginTop: "var(--space-1)", fontWeight: "var(--weight-semibold)" }}>
        {etiqueta}
      </div>
    </div>
  );
}

export function Titulo({ children }) {
  return <h2 className="titulo-seccion">{children}</h2>;
}

// Barra de proporción: `parte` sobre `maximo`.
export function Barra({ parte, maximo, color = "var(--accent)" }) {
  const pct = maximo > 0 ? Math.max(parte > 0 ? 3 : 0, (parte / maximo) * 100) : 0;
  return (
    <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--accent-soft)", overflow: "hidden", flex: 1, minWidth: 60 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "var(--radius-full)" }} />
    </div>
  );
}

export function Chip({ children, bg, fg }) {
  return (
    <span className="chip" style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

// tipo: "error" (rojo) | "aviso" (ámbar).
export function Aviso({ children, tipo = "error" }) {
  return (
    <Banner tono={tipo === "error" ? "danger" : "warning"} alerta style={{ margin: "var(--space-3) 0" }}>
      {children}
    </Banner>
  );
}
