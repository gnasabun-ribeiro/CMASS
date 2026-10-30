import { useEffect, useState } from "react";
import { listarCentrosDeCostos } from "../../lib/centrosDeCostos.js";

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

// Cliente = centro de costos del DW (también lo usa la Tarjeta TOP, en PasoTop.jsx).
export function SelectorCliente({ value, onChange, style, id }) {
  const [centros, setCentros] = useState([]);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error

  useEffect(() => {
    let cancelado = false;
    listarCentrosDeCostos()
      .then((lista) => {
        if (cancelado) return;
        setCentros(lista);
        setEstado("ok");
      })
      .catch(() => !cancelado && setEstado("error"));
    return () => {
      cancelado = true;
    };
  }, []);

  // Si el valor guardado ya no está en la lista (centro dado de baja), se sigue mostrando.
  const valorFueraDeLista = value && !centros.some((c) => c.etiqueta === value);

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={style}>
      <option value="" disabled>
        {estado === "cargando"
          ? "Cargando centros de costo…"
          : estado === "error"
            ? "No se pudieron cargar los centros de costo"
            : "Seleccioná un cliente"}
      </option>
      {valorFueraDeLista && <option value={value}>{value}</option>}
      {centros.map((c) => (
        <option key={c.id ?? c.codigo} value={c.etiqueta}>
          {c.etiqueta}
        </option>
      ))}
    </select>
  );
}

export default function PasoGenerales({ valores, onCambiar }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(230px,100%),1fr))", gap: 13 }}>
      <label>
        <span style={labelStyle}>Cliente</span>
        <SelectorCliente value={valores.cliente} onChange={(v) => onCambiar("cliente", v)} style={fieldStyle} />
      </label>
      <label>
        <span style={labelStyle}>Ubicación / Zona</span>
        <input
          placeholder="Batería 12 — sector bombas"
          maxLength={200}
          value={valores.ubicacion}
          onChange={(e) => onCambiar("ubicacion", e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label>
        <span style={labelStyle}>Grupo auditado</span>
        <input
          placeholder="Cuadrilla mecánica 3"
          maxLength={200}
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
          maxLength={1000}
          value={valores.tareaObservada}
          onChange={(e) => onCambiar("tareaObservada", e.target.value)}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>
    </div>
  );
}
