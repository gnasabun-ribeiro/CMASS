import { useEffect, useMemo } from "react";
import Icon from "../../components/Icon.jsx";
import logoRibeiro from "../../assets/logo-ribeiro.png";
import { ICONOS_TOP, MARCAS_TOP, agruparPorCategoria, marcaTop, respuestaTop, valorTop } from "../../data/checklist.js";
import { useCelular } from "../../lib/useCelular.js";
import { SelectorCliente } from "./PasoGenerales.jsx";

// Pasos 1 a 3 de la Tarjeta TOP con el formato de la tarjeta impresa (RG 28-01): encabezado
// con logo y código, bandas de títulos, casilleros SI / NO / N/A y renglones. Las bandas van en
// el tono suave del tema (lila en Default; en papel son amarillas); el negro es fijo y las
// respuestas marcadas llevan los colores semánticos de siempre (verde seguro, rojo desvío).
const TINTA = "#1b1b1b";
const FONDO_BANDA = "var(--violet-300)";
const LINEA = `2px solid ${TINTA}`;
const LINEA_FINA = `1px solid ${TINTA}`;
const RENGLON = 30; // alto de cada renglón de los textos largos

const tarjetaStyle = { border: LINEA, borderRadius: 10, overflow: "hidden", background: "#fff", color: TINTA };

// Campo sobre una línea, como en papel.
const campoLinea = {
  width: "100%",
  boxSizing: "border-box",
  border: 0,
  borderBottom: `1.5px solid ${TINTA}`,
  borderRadius: 0,
  background: "transparent",
  color: TINTA,
  font: "inherit",
  fontSize: 15,
  padding: "8px 2px",
  minHeight: 42,
};

const renglones = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  border: 0,
  borderRadius: 0,
  resize: "vertical",
  font: "inherit",
  fontSize: 15,
  color: TINTA,
  lineHeight: `${RENGLON}px`,
  padding: "0 14px",
  backgroundColor: "#fff",
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${RENGLON - 1}px, #a3a3a3 ${RENGLON - 1}px ${RENGLON}px)`,
  backgroundAttachment: "local", // los renglones acompañan al texto si se desplaza
  outlineOffset: -3, // la tarjeta recorta lo que sobresale
};

export function EncabezadoTarjeta() {
  const celular = useCelular();
  const logo = celular ? 40 : 58;
  return (
    <div style={{ display: "grid", gridTemplateColumns: celular ? "54px minmax(0,1fr) 80px" : "86px minmax(0,1fr) 132px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRight: LINEA, padding: 6 }}>
        <img src={logoRibeiro} alt="Ribeiro" width={logo} height={logo} style={{ display: "block" }} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontWeight: 800,
          fontSize: celular ? 13.5 : 19,
          lineHeight: 1.15,
          padding: "8px 6px",
          textTransform: "uppercase",
        }}
      >
        Tarjeta de observación preventiva
      </div>
      <div style={{ borderLeft: LINEA, fontSize: celular ? 9.5 : 11, lineHeight: 1.25, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "5px 6px", borderBottom: LINEA_FINA, flex: 1 }}>
          Descripción:
          <br />
          Emisión APROBADO
        </div>
        <div style={{ padding: "5px 6px" }}>
          RG 28-01
          <br />
          Rev: 0
        </div>
      </div>
    </div>
  );
}

function Banda({ children, htmlFor, chica, style }) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <Tag
      htmlFor={htmlFor}
      style={{
        display: "block",
        background: FONDO_BANDA,
        color: TINTA,
        fontWeight: 800,
        fontSize: chica ? 11.5 : 13,
        lineHeight: 1.3,
        textTransform: "uppercase",
        textAlign: "center",
        padding: "7px 10px",
        borderTop: LINEA,
        borderBottom: LINEA,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

function Renglon({ id, label, children }) {
  const celular = useCelular();
  return (
    <div style={{ display: celular ? "block" : "grid", gridTemplateColumns: "210px minmax(0,1fr)", alignItems: "end", columnGap: 10, padding: celular ? "8px 12px" : "6px 14px" }}>
      <label htmlFor={id} style={{ display: "block", fontWeight: 800, fontSize: 12.5, textTransform: "uppercase", paddingBottom: celular ? 0 : 10 }}>
        {label}:
      </label>
      {children}
    </div>
  );
}

// Paso 1 — "Datos de quien completa la TOP" (dorso de la tarjeta). El cliente no está en la
// tarjeta impresa: se pide igual porque Registros y el panel ordenan por cliente.
export function TopDatos({ valores, onCambiar, onCambiarDato }) {
  const datos = valores.datos || {};
  const filas = [
    { id: "top-observador", label: "Apellido y nombre", value: datos.observador, onChange: (v) => onCambiarDato("observador", v), maxLength: 120 },
    { id: "top-funcion", label: "Función", value: datos.funcion, onChange: (v) => onCambiarDato("funcion", v), maxLength: 120 },
    { id: "top-area", label: "Área de trabajo", value: valores.ubicacion, onChange: (v) => onCambiar("ubicacion", v), maxLength: 200 },
    { id: "top-fecha", label: "Fecha de observación", value: valores.fechaHora, onChange: (v) => onCambiar("fechaHora", v), type: "datetime-local" },
  ];
  return (
    <div style={tarjetaStyle}>
      <EncabezadoTarjeta />
      <Banda>Datos de quien completa la TOP</Banda>
      <div style={{ padding: "4px 0 12px" }}>
        {filas.map((f) => (
          <Renglon key={f.id} id={f.id} label={f.label}>
            <input id={f.id} type={f.type || "text"} maxLength={f.maxLength} value={f.value || ""} onChange={(e) => f.onChange(e.target.value)} style={campoLinea} />
          </Renglon>
        ))}
        <Renglon id="top-cliente" label="Cliente / obra">
          <SelectorCliente id="top-cliente" value={valores.cliente} onChange={(v) => onCambiar("cliente", v)} style={campoLinea} />
        </Renglon>
      </div>
    </div>
  );
}

function FilaTop({ item, valor, comentario = "", columnas, onResponder, onComentar, onComentarioListo }) {
  const marca = marcaTop(item, valor);
  // "Otros" con SI/NO lleva qué se observó, y lo escrito necesita una marca para guardarse.
  const falta = item.otros && (valor ? valor !== "na" && !comentario.trim() : Boolean(comentario.trim()));
  return (
    <div style={{ display: "grid", gridTemplateColumns: columnas, minHeight: 46 }}>
      <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "center", fontSize: 14, lineHeight: 1.35, minWidth: 0 }}>
        {item.otros ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <label htmlFor={`detalle-${item.codigo}`} style={{ flex: "0 0 auto" }}>
                Otros:
              </label>
              <input
                id={`detalle-${item.codigo}`}
                maxLength={200}
                value={comentario}
                onChange={(e) => onComentar(item, e.target.value)}
                onBlur={onComentarioListo}
                aria-describedby={falta ? `falta-${item.codigo}` : undefined}
                style={{ ...campoLinea, flex: 1, minWidth: 0, borderBottomWidth: 1, fontSize: 14, padding: "4px 2px", minHeight: 30 }}
              />
            </div>
            {falta ? (
              <div id={`falta-${item.codigo}`} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--danger-fg)", marginTop: 3 }}>
                {valor ? "Escribí qué se observó." : "Marcá SI, NO o N/A."}
              </div>
            ) : null}
          </>
        ) : (
          item.texto
        )}
      </div>
      {MARCAS_TOP.map((m) => {
        const on = marca === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onResponder(item, valorTop(item, m.value))}
            aria-pressed={on}
            aria-label={`${m.label}: ${item.otros ? "Otros" : item.texto}`}
            style={{
              border: 0,
              borderLeft: LINEA_FINA,
              borderTop: LINEA_FINA,
              borderRadius: 0,
              padding: 0,
              minHeight: 44,
              background: on ? respuestaTop(item, valor).fg : "#fff",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              outlineOffset: -3,
            }}
          >
            {on ? <Icon name="check" size={22} strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}

// Paso 2 — "Tipo de observación" (frente de la tarjeta): todas las categorías en una sola
// página, con su pictograma a la izquierda (en el celular, al lado del título).
export function TopObservacion({ items, respuestas, comentarios = {}, onResponder, onComentar, onComentarioListo, irA }) {
  const celular = useCelular();
  const bloques = useMemo(() => agruparPorCategoria(items), [items]);
  const columnas = `minmax(0,1fr) repeat(3, ${celular ? 40 : 54}px)`;

  // Lleva al "Otros" que falta completar (aviso del formulario).
  useEffect(() => {
    if (!irA) return;
    const campo = document.getElementById(`detalle-${irA.codigo}`);
    campo?.scrollIntoView({ block: "center", behavior: "smooth" });
    campo?.focus({ preventScroll: true });
  }, [irA]);

  return (
    <div style={tarjetaStyle}>
      <EncabezadoTarjeta />
      <Banda>Tipo de observación</Banda>
      {bloques.map((b, bi) => (
        <section key={b.categoria} aria-label={b.categoria} style={{ display: "flex", borderTop: bi ? LINEA : 0 }}>
          {!celular ? (
            <div aria-hidden="true" style={{ flex: "0 0 86px", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <Icon name={ICONOS_TOP[b.categoria]} size={50} strokeWidth={1.4} />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: columnas, alignItems: "end" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: celular ? 13.5 : 14.5, fontWeight: 800, lineHeight: 1.25, padding: "10px 10px 6px" }}>
                {celular ? (
                  <span aria-hidden="true" style={{ display: "inline-flex", flex: "0 0 auto" }}>
                    <Icon name={ICONOS_TOP[b.categoria]} size={26} strokeWidth={1.6} />
                  </span>
                ) : null}
                {bi + 1}) {b.categoria}
              </h3>
              {MARCAS_TOP.map((m) => (
                <div key={m.value} aria-hidden="true" style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, paddingBottom: 5 }}>
                  {m.label}
                </div>
              ))}
            </div>
            {b.items.map((item) => (
              <FilaTop
                key={item.codigo}
                item={item}
                valor={respuestas[item.codigo]}
                comentario={comentarios[item.codigo]}
                columnas={columnas}
                onResponder={onResponder}
                onComentar={onComentar}
                onComentarioListo={onComentarioListo}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Paso 3 — detalle y acciones (dorso de la tarjeta), sobre renglones.
export function TopDetalle({ valores, onCambiar, onCambiarDato }) {
  const datos = valores.datos || {};
  const campos = [
    { id: "top-detalle", titulo: "Detalle observación", value: valores.tareaObservada, onChange: (v) => onCambiar("tareaObservada", v) },
    { id: "top-accion-inmediata", titulo: "Acción inmediata", value: datos.accionInmediata, onChange: (v) => onCambiarDato("accionInmediata", v) },
    { id: "top-accion-reiteracion", titulo: "Acción para evitar la reiteración", value: datos.accionReiteracion, onChange: (v) => onCambiarDato("accionReiteracion", v) },
  ];
  return (
    <div style={tarjetaStyle}>
      <EncabezadoTarjeta />
      {campos.map((c) => (
        <div key={c.id}>
          <Banda htmlFor={c.id}>{c.titulo}</Banda>
          <textarea id={c.id} rows={5} maxLength={1000} value={c.value || ""} onChange={(e) => c.onChange(e.target.value)} style={renglones} />
        </div>
      ))}
      <Banda chica style={{ borderBottom: 0 }}>
        La prevención que hagamos hoy, marcará el camino del mañana
      </Banda>
    </div>
  );
}
