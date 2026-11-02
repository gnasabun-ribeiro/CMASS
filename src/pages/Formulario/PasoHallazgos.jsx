import { useEffect, useId, useRef, useState } from "react";
import { SEVERIDADES } from "../../data/severidades.js";
import ColaboradorInput from "../../components/ColaboradorInput.jsx";
import Icon from "../../components/Icon.jsx";
import Button from "../../components/ui/Button.jsx";
import { Field, Input, Textarea } from "../../components/ui/Field.jsx";
import { toast } from "../../components/ui/Toast.jsx";
import { useCelular } from "../../lib/useCelular.js";

const VACIO = { titulo: "", severidad: "Medio", detalle: "", responsable: "", vence: "" };

// Lo que se guarda, sin espacios en los bordes del título y el responsable.
const limpiar = (form) => ({
  titulo: form.titulo.trim(),
  severidad: form.severidad,
  detalle: form.detalle,
  responsable: form.responsable.trim(),
  vence: form.vence,
});
const iguales = (a, b) => Object.keys(VACIO).every((k) => (a[k] || "") === (b[k] || ""));

// Formulario de un hallazgo: el mismo para cargar uno nuevo y para corregir uno ya cargado.
// `onGuardar` devuelve false si no se pudo guardar (se conserva lo escrito; el error se ve arriba).
function FormHallazgo({ inicial = VACIO, etiqueta, encabezado, textoGuardar, onGuardar, onCancelar, colaboradores, enfocar = false }) {
  const celular = useCelular();
  const base = `hallazgo${useId()}`;
  const seccionRef = useRef(null);
  const tituloRef = useRef(null);
  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [faltaTitulo, setFaltaTitulo] = useState(false);

  // Al abrir "Editar", el foco pasa al formulario (sin abrir el teclado del celular).
  useEffect(() => {
    if (!enfocar) return;
    seccionRef.current?.focus({ preventScroll: true });
    seccionRef.current?.scrollIntoView({ block: "nearest" });
  }, [enfocar]);

  const guardar = async () => {
    if (guardando) return;
    if (!form.titulo.trim()) {
      setFaltaTitulo(true); // antes no pasaba nada y no se entendía por qué
      tituloRef.current?.focus();
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(limpiar(form));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      ref={seccionRef}
      tabIndex={-1}
      aria-label={etiqueta}
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1.5px dashed var(--accent-border-strong)",
        background: "var(--surface-muted)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {encabezado ? (
        <div className="t-overline" style={{ color: "var(--accent-text)" }}>
          {encabezado}
        </div>
      ) : null}
      <Field label="Título" id={`${base}-titulo`} error={faltaTitulo ? "Escribí un título para el hallazgo." : null}>
        <Input
          ref={tituloRef}
          placeholder="Título del hallazgo"
          maxLength={120}
          value={form.titulo}
          onChange={(e) => {
            setForm({ ...form, titulo: e.target.value });
            setFaltaTitulo(false);
          }}
        />
      </Field>
      <div>
        <div id={`${base}-severidad`} className="field-label">
          Severidad
        </div>
        <div role="group" aria-labelledby={`${base}-severidad`} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {SEVERIDADES.map((s) => {
            const on = form.severidad === s.value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={on}
                onClick={() => setForm({ ...form, severidad: s.value })}
                style={{
                  border: `1.5px solid ${on ? s.fg : "var(--border)"}`,
                  background: on ? s.bg : "var(--surface)",
                  color: on ? s.fg : "var(--text-secondary)",
                  fontSize: "var(--text-footnote)",
                  fontWeight: "var(--weight-bold)",
                  padding: "0 var(--space-4)",
                  minHeight: "var(--touch-min)",
                  borderRadius: "var(--radius-lg)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                {on ? <Icon name="check" size={14} /> : null}
                {s.value}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Detalle" id={`${base}-detalle`}>
        <Textarea rows={2} placeholder="Qué se observó…" maxLength={1000} value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
      </Field>
      {/* En el celular uno debajo del otro: lado a lado no se leía el responsable ni la fecha. */}
      <div style={celular ? { display: "grid", gap: "var(--space-3)" } : { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: "var(--space-3)", alignItems: "start" }}>
        <div>
          <label htmlFor={`${base}-responsable`} className="field-label">
            Responsable
          </label>
          <ColaboradorInput
            id={`${base}-responsable`}
            placeholder="Nombre y apellido"
            maxLength={120}
            value={form.responsable}
            onChange={(v) => setForm({ ...form, responsable: v })}
            colaboradores={colaboradores}
          />
        </div>
        <Field label="Vence" id={`${base}-vence`}>
          <Input type="date" value={form.vence} onChange={(e) => setForm({ ...form, vence: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button variant="neutral" style={{ flex: 1 }} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button variant="solid" style={{ flex: 1 }} onClick={guardar} loading={guardando}>
          {guardando ? "Guardando…" : textoGuardar}
        </Button>
      </div>
    </section>
  );
}

export default function PasoHallazgos({ hallazgos, onAgregar, onEditar, onEliminar, colaboradores = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // hallazgo que se está corrigiendo
  const botonesEditar = useRef(new Map()); // para devolver el foco a "Editar" al cerrar
  const devolverFocoA = useRef(null);
  const claveDe = (h, i) => h.id ?? `${h.titulo}-${i}`;
  const esEditado = (h) => Boolean(editando) && (h.id ? h.id === editando.id : h === editando);

  useEffect(() => {
    if (editando || devolverFocoA.current == null) return;
    botonesEditar.current.get(devolverFocoA.current)?.focus();
    devolverFocoA.current = null;
  }, [editando]);

  // Eliminar no pregunta: el aviso que aparece tiene "Deshacer" (ver borrarConDeshacer en Formulario).
  const eliminar = (h) => onEliminar(h);

  const agregar = async (datos) => {
    const ok = await onAgregar(datos);
    if (ok === false) return; // falló el guardado: se conserva lo escrito
    toast.success("Hallazgo guardado", { descripcion: datos.titulo });
    setAbierto(false);
  };

  const cerrarEdicion = (clave) => {
    devolverFocoA.current = clave;
    setEditando(null);
  };

  const corregir = async (h, clave, datos) => {
    if (iguales(datos, h.crudo)) {
      cerrarEdicion(clave); // no cambió nada: no hay nada que guardar ni que enviar
      return;
    }
    const ok = await onEditar(h, datos);
    if (ok === false) return;
    toast.success("Hallazgo corregido", { descripcion: datos.titulo });
    cerrarEdicion(h.id ?? `${datos.titulo}-${hallazgos.indexOf(h)}`); // sin id, la clave sale del título nuevo
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {hallazgos.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-3)" }}>
          {hallazgos.map((h, i) => {
            const clave = claveDe(h, i);
            if (esEditado(h)) {
              return (
                <li key={clave}>
                  <FormHallazgo
                    inicial={h.crudo}
                    etiqueta={`Editar hallazgo: ${h.titulo}`}
                    encabezado="Editar hallazgo"
                    textoGuardar="Guardar cambios"
                    onGuardar={(datos) => corregir(h, clave, datos)}
                    onCancelar={() => cerrarEdicion(clave)}
                    colaboradores={colaboradores}
                    enfocar
                  />
                </li>
              );
            }
            return (
              <li
                key={clave}
                className="pop-in"
                style={{
                  borderRadius: "var(--radius-lg)",
                  background: "var(--hallazgo-bg)",
                  border: "var(--hairline) solid var(--hallazgo-border)",
                  padding: "var(--space-4)",
                  animationDelay: `${i * 0.045}s`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--space-2)" }}>
                  <h3 className="t-headline" style={{ fontSize: "var(--text-callout)", overflowWrap: "anywhere" }}>
                    {h.titulo}
                  </h3>
                  <span className="chip" style={{ background: h.sevBg, color: h.sevFg }}>
                    {h.severidad}
                  </span>
                </div>
                {h.detalle ? (
                  <p className="t-footnote" style={{ color: "var(--text-secondary)", marginBottom: "var(--space-3)", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                    {h.detalle}
                  </p>
                ) : null}
                <div className="t-caption" style={{ display: "flex", gap: "var(--space-2) var(--space-4)", flexWrap: "wrap", color: "var(--text-tertiary)", alignItems: "center" }}>
                  <span>
                    Responsable: <strong style={{ color: "var(--text-primary)" }}>{h.responsable}</strong>
                  </span>
                  <span>
                    Vence: <strong style={{ color: "var(--text-primary)" }}>{h.vence}</strong>
                  </span>
                  <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto" }}>
                    <Button
                      ref={(el) => (el ? botonesEditar.current.set(clave, el) : botonesEditar.current.delete(clave))}
                      variant="secondary"
                      size="sm"
                      icon="lapiz"
                      aria-label={`Editar hallazgo: ${h.titulo}`}
                      onClick={() => setEditando(h)}
                    >
                      Editar
                    </Button>
                    <Button variant="danger-soft" size="sm" icon="tacho" aria-label={`Eliminar hallazgo: ${h.titulo}`} onClick={() => eliminar(h)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {abierto ? (
        <FormHallazgo etiqueta="Nuevo hallazgo" textoGuardar="Guardar hallazgo" onGuardar={agregar} onCancelar={() => setAbierto(false)} colaboradores={colaboradores} />
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="btn btn--lg"
          style={{ border: "1.5px dashed var(--accent-border-strong)", background: "var(--surface-muted)", color: "var(--accent-text)" }}
        >
          + Agregar hallazgo
        </button>
      )}
    </div>
  );
}
