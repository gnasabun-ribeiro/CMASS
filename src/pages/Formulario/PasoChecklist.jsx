import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import Button from "../../components/ui/Button.jsx";
import { Textarea } from "../../components/ui/Field.jsx";
import { OPCIONES, agruparPorCategoria } from "../../data/checklist.js";
import { useCelular } from "../../lib/useCelular.js";

// `irA` ({ codigo }): abre la página de ese ítem y lleva el foco a su detalle (lo usa el aviso
// "Falta el detalle…" del formulario). Es un objeto nuevo en cada pedido, así se repite.
export default function PasoChecklist({ items, respuestas, comentarios = {}, onResponder, onComentar, onComentarioListo, onPaginaChange, irA }) {
  const celular = useCelular();
  const bloques = useMemo(() => agruparPorCategoria(items), [items]);
  const [bloqueActual, setBloqueActual] = useState(0);
  const indice = Math.min(bloqueActual, bloques.length - 1);
  const bloque = bloques[indice];

  useEffect(() => {
    if (!irA) return;
    const destino = bloques.findIndex((b) => b.items.some((i) => i.codigo === irA.codigo));
    if (destino >= 0) setBloqueActual(destino);
  }, [irA, bloques]);

  const irAAtendidoRef = useRef(null); // cada pedido se atiende una vez (no al volver a la página)
  useEffect(() => {
    if (!irA || irAAtendidoRef.current === irA || !bloque?.items.some((i) => i.codigo === irA.codigo)) return;
    irAAtendidoRef.current = irA;
    const campo = document.getElementById(`detalle-${irA.codigo}`);
    campo?.scrollIntoView({ block: "center", behavior: "smooth" });
    campo?.focus({ preventScroll: true });
  }, [irA, bloque]);

  // Avisa al wizard si estamos en la última página, para mostrar "Siguiente" recién ahí.
  useLayoutEffect(() => {
    onPaginaChange?.(indice === bloques.length - 1);
  }, [indice, bloques.length, onPaginaChange]);

  if (!bloque) return null;

  const esPrimero = indice === 0;
  const esUltimo = indice === bloques.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <Button
          variant={esPrimero ? "secondary" : "strong"}
          icon="back"
          onClick={() => setBloqueActual((b) => Math.max(0, b - 1))}
          disabled={esPrimero}
          aria-label="Categoría anterior"
        />

        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }} aria-live="polite">
          <div className="t-caption" style={{ color: "var(--text-tertiary)", fontWeight: "var(--weight-semibold)" }}>
            Página {indice + 1} de {bloques.length}
          </div>
          <h3 className="t-headline" style={{ fontSize: "var(--text-callout)", color: "var(--accent-text)", overflowWrap: "anywhere" }}>
            {bloque.categoria}
          </h3>
        </div>

        <Button
          variant={esUltimo ? "secondary" : "strong"}
          icon="arrowRight"
          onClick={() => setBloqueActual((b) => Math.min(bloques.length - 1, b + 1))}
          disabled={esUltimo}
          aria-label="Categoría siguiente"
        />
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {bloque.items.map(({ codigo, categoria, texto }, i) => (
          <li
            key={codigo}
            className="pop-in"
            style={{
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-muted)",
              border: "var(--hairline) solid var(--border)",
              padding: celular ? "var(--space-3)" : "var(--space-4)",
              animationDelay: `${i * 0.045}s`,
            }}
          >
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
              <span className="chip chip--accent tabular" style={{ borderRadius: "var(--radius-sm)", flex: "0 0 auto" }}>
                {codigo}
              </span>
              <span id={`texto-${codigo}`} className="t-callout" style={{ fontWeight: "var(--weight-medium)" }}>
                {texto}
              </span>
            </div>
            {/* En el celular, grilla de 2×2 con botones parejos (en fila quedaban 2 arriba y 2 abajo de distinto ancho). */}
            <div
              role="group"
              aria-labelledby={`texto-${codigo}`}
              style={celular ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" } : { display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}
            >
              {OPCIONES.map((o) => {
                const on = respuestas[codigo] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onResponder({ codigo, categoria, texto }, o.value)}
                    aria-pressed={on}
                    style={{
                      border: `1.5px solid ${on ? o.border : "var(--border)"}`,
                      background: on ? o.bg : "var(--surface)",
                      color: on ? o.fg : "var(--text-secondary)",
                      fontSize: "var(--text-footnote)",
                      fontWeight: "var(--weight-bold)",
                      padding: celular ? "var(--space-2) var(--space-1-5)" : "var(--space-2) var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      minHeight: "var(--touch-min)",
                      lineHeight: 1.2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      // "Cumple parcialmente" no entra en media fila de 360 px: ahí puede pasar a dos líneas.
                      whiteSpace: celular ? "normal" : "nowrap",
                    }}
                  >
                    {on ? <Icon name="check" size={14} /> : null}
                    {o.label}
                  </button>
                );
              })}
            </div>
            {respuestas[codigo] === "parcial" ? (
              <div style={{ marginTop: "var(--space-3)" }}>
                <label htmlFor={`detalle-${codigo}`} className="field-label" style={{ color: "var(--warn-fg)" }}>
                  Detalle de lo que no cumple (obligatorio)
                </label>
                <Textarea
                  id={`detalle-${codigo}`}
                  required
                  aria-required="true"
                  aria-invalid={!comentarios[codigo]?.trim()}
                  aria-describedby={!comentarios[codigo]?.trim() ? `falta-${codigo}` : undefined}
                  rows={3}
                  maxLength={1000}
                  value={comentarios[codigo] || ""}
                  onChange={(e) => onComentar({ codigo, categoria, texto }, e.target.value)}
                  onBlur={onComentarioListo}
                  placeholder="Qué se cumple y qué falta"
                  style={{ background: "var(--surface)" }}
                />
                {!comentarios[codigo]?.trim() ? (
                  <div id={`falta-${codigo}`} className="field-error">
                    Escribí el detalle para poder cerrar la inspección.
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {/* Pasa a otra fila en vez de desplazarse: centrado y con scroll, las primeras páginas quedaban
          cortadas a la izquierda sin forma de llegar (Trailers tiene 12 secciones). */}
      <nav aria-label="Categorías del checklist" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "center" }}>
        {bloques.map((b, i) => {
          const respondidas = b.items.filter((it) => respuestas[it.codigo] != null).length;
          const completo = respondidas === b.items.length;
          const on = i === indice;
          return (
            <button
              key={b.categoria}
              type="button"
              onClick={() => setBloqueActual(i)}
              aria-label={`${b.categoria} (${respondidas}/${b.items.length})`}
              aria-current={on ? "page" : undefined}
              title={b.categoria}
              className="tabular"
              style={{
                flex: "0 0 auto",
                width: "var(--touch-min)",
                height: "var(--touch-min)",
                border: 0,
                background: on ? "var(--accent)" : completo ? "var(--accent-soft-strong)" : "var(--accent-soft)",
                color: on ? "var(--on-accent)" : completo ? "var(--accent-text)" : "var(--text-tertiary)",
                borderRadius: "var(--radius-lg)",
                fontSize: "var(--text-callout)",
                fontWeight: "var(--weight-bold)",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
