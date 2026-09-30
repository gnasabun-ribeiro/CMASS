import { useState } from "react";
import { correoDe, filtrarColaboradores } from "../lib/colaboradores.js";

// Campo de texto con sugerencias de colaboradores (nombre y apellido). Sigue siendo
// texto libre, pero si el texto coincide con un colaborador se muestra su correo:
// es el que recibe el informe al cerrar la inspección (ver registrarDestinatarios).
export default function ColaboradorInput({ value, onChange, onBlur, colaboradores, placeholder, style }) {
  const [abierto, setAbierto] = useState(false);
  const sugerencias = abierto ? filtrarColaboradores(colaboradores, value).slice(0, 6) : [];
  const correo = correoDe(colaboradores, value);
  const hayTexto = value.trim().length > 0;

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false);
          onBlur?.();
        }}
        style={style}
      />
      {sugerencias.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            zIndex: 30,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-float)",
            overflow: "hidden",
          }}
        >
          {sugerencias.map((c, i) => (
            <button
              key={`${c.correo}-${i}`}
              type="button"
              // onMouseDown: elegir antes de que el input pierda el foco y cierre la lista
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c.etiqueta);
                setAbierto(false);
              }}
              style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "#fff", padding: "9px 12px", cursor: "pointer", minHeight: 44 }}
            >
              <span style={{ display: "block", fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>{c.etiqueta}</span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>{c.correo || "sin correo cargado"}</span>
            </button>
          ))}
        </div>
      ) : null}
      {hayTexto ? (
        <div style={{ fontSize: 11.5, marginTop: 5, color: correo ? "var(--success-fg)" : "var(--muted)" }}>
          {correo ? `El informe se enviará a ${correo}` : "Sin correo asociado: elegí a la persona de la lista para que reciba el informe"}
        </div>
      ) : null}
    </div>
  );
}
