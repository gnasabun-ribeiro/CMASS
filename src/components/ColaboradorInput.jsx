import { useId, useState } from "react";
import { correoDe, filtrarColaboradores, sinCorreoCorporativo } from "../lib/colaboradores.js";

// Campo de texto con sugerencias de colaboradores (nombre y apellido). Sigue siendo
// texto libre, pero si el texto coincide con un colaborador se muestra su correo:
// es el que recibe el informe al cerrar la inspección (ver registrarDestinatarios).
// Teclado: ↑ ↓ recorren las sugerencias, Enter elige, Escape las cierra.
export default function ColaboradorInput({ value, onChange, onBlur, colaboradores, placeholder, maxLength, id, className = "field", style }) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);
  const auto = useId();
  const idLista = `${id || auto}-sugerencias`;
  const idAviso = `${id || auto}-correo`;
  const sugerencias = abierto ? filtrarColaboradores(colaboradores, value).slice(0, 6) : [];
  const correo = correoDe(colaboradores, value);
  const faltaCorreo = sinCorreoCorporativo(colaboradores, value);
  const hayTexto = value.trim().length > 0;

  const elegir = (c) => {
    onChange(c.etiqueta);
    setAbierto(false);
    setActiva(-1);
  };

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={sugerencias.length > 0}
        aria-controls={sugerencias.length ? idLista : undefined}
        aria-activedescendant={activa >= 0 && sugerencias[activa] ? `${idLista}-${activa}` : undefined}
        aria-describedby={hayTexto ? idAviso : undefined}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        autoComplete="off"
        autoCapitalize="words"
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setActiva(-1);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (!sugerencias.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const paso = e.key === "ArrowDown" ? 1 : -1;
            setActiva((a) => (a + paso + sugerencias.length) % sugerencias.length);
          } else if (e.key === "Enter" && activa >= 0) {
            e.preventDefault();
            elegir(sugerencias[activa]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
        style={style}
      />
      {sugerencias.length > 0 ? (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Colaboradores"
          className="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: "var(--space-1)",
            zIndex: "var(--z-dropdown)",
            background: "var(--surface-raised)",
            border: "var(--hairline) solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-4)",
          }}
        >
          {sugerencias.map((c, i) => (
            <li
              key={`${c.correo}-${i}`}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === activa}
              data-activa={i === activa || undefined}
              className="opcion"
              // onMouseDown: elegir antes de que el input pierda el foco y cierre la lista
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(c);
              }}
              onPointerMove={() => i !== activa && setActiva(i)}
              style={{ minHeight: "var(--touch-min)" }}
            >
              <span className="opcion__texto">
                <span className="opcion__etiqueta" style={{ fontWeight: "var(--weight-semibold)" }}>
                  {c.etiqueta}
                </span>
                <span className="opcion__descripcion">{c.correo || "sin correo cargado"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {hayTexto ? (
        <div
          id={idAviso}
          className="t-caption"
          style={{ marginTop: "var(--space-1-5)", color: correo ? "var(--success-fg)" : faltaCorreo ? "var(--warn-fg)" : "var(--text-tertiary)" }}
        >
          {correo
            ? `El informe se enviará a ${correo}`
            : faltaCorreo
              ? "Esta persona no tiene correo corporativo (@ribeirosrl.com.ar): hay que cargárselo para que reciba el informe"
              : "Sin correo asociado: elegí a la persona de la lista para que reciba el informe"}
        </div>
      ) : null}
    </div>
  );
}
