const fieldStyle = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 12,
  fontSize: 14,
  background: "var(--violet-25)",
  color: "var(--ink)",
  minHeight: 48,
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
  marginBottom: 5,
};

export default function PasoGenerales({ valores, onCambiar }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 13 }}>
      <label>
        <span style={labelStyle}>Cliente</span>
        <select value={valores.cliente} onChange={(e) => onCambiar("cliente", e.target.value)} style={fieldStyle}>
          <option value="" disabled>
            Seleccioná un cliente
          </option>
          <option>YPF — Yacimiento Sur</option>
          <option>Vialidad Provincial</option>
        </select>
      </label>
      <label>
        <span style={labelStyle}>Ubicación / Zona</span>
        <input
          placeholder="Batería 12 — sector bombas"
          value={valores.ubicacion}
          onChange={(e) => onCambiar("ubicacion", e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label>
        <span style={labelStyle}>Grupo auditado</span>
        <input
          placeholder="Cuadrilla mecánica 3"
          value={valores.grupoAuditado}
          onChange={(e) => onCambiar("grupoAuditado", e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label>
        <span style={labelStyle}>Fecha y hora</span>
        <input
          type="datetime-local"
          value={valores.fechaHora}
          onChange={(e) => onCambiar("fechaHora", e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ gridColumn: "1/-1" }}>
        <span style={labelStyle}>Tarea observada</span>
        <textarea
          rows={3}
          placeholder="Descripción breve de la tarea…"
          value={valores.tareaObservada}
          onChange={(e) => onCambiar("tareaObservada", e.target.value)}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>
    </div>
  );
}
