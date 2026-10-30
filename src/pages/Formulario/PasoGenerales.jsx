import { useEffect, useMemo, useState } from "react";
import { listarCentrosDeCostos } from "../../lib/centrosDeCostos.js";
import { Field, Input, Textarea } from "../../components/ui/Field.jsx";
import { Combobox } from "../../components/ui/Select.jsx";

// Cliente = centro de costos del DW (también lo usa la Tarjeta TOP, en PasoTop.jsx). Son ~180:
// selector con búsqueda (sin tildes: "nandu" encuentra "Ñandú").
export function SelectorCliente({ value, onChange, id, variant, style }) {
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

  const opciones = useMemo(() => {
    const lista = centros.map((c) => ({ value: c.etiqueta, label: c.etiqueta }));
    // Si el valor guardado ya no está en la lista (centro dado de baja), se sigue mostrando.
    if (value && !centros.some((c) => c.etiqueta === value)) lista.unshift({ value, label: value });
    return lista;
  }, [centros, value]);

  return (
    <Combobox
      id={id}
      titulo="Cliente"
      options={opciones}
      value={value || null}
      onChange={onChange}
      variant={variant}
      style={style}
      placeholder={estado === "cargando" ? "Cargando centros de costo…" : estado === "error" ? "No se pudieron cargar los centros de costo" : "Seleccioná un cliente"}
      placeholderBusqueda="Buscar cliente o centro de costo"
      vacio={estado === "cargando" ? "Cargando…" : estado === "error" ? "No se pudieron cargar los centros de costo." : "Ningún cliente coincide."}
    />
  );
}

export default function PasoGenerales({ valores, onCambiar }) {
  return (
    <div className="form-grid">
      <Field label="Cliente" id="generales-cliente">
        <SelectorCliente value={valores.cliente} onChange={(v) => onCambiar("cliente", v)} />
      </Field>
      <Field label="Ubicación / Zona" id="generales-ubicacion">
        <Input placeholder="Batería 12 — sector bombas" maxLength={200} value={valores.ubicacion} onChange={(e) => onCambiar("ubicacion", e.target.value)} />
      </Field>
      <Field label="Grupo auditado" id="generales-grupo">
        <Input placeholder="Cuadrilla mecánica 3" maxLength={200} value={valores.grupoAuditado} onChange={(e) => onCambiar("grupoAuditado", e.target.value)} />
      </Field>
      <Field label="Fecha y hora" id="generales-fecha">
        <Input type="datetime-local" value={valores.fechaHora} onChange={(e) => onCambiar("fechaHora", e.target.value)} />
      </Field>
      <Field label="Tarea observada" id="generales-tarea" style={{ gridColumn: "1/-1" }}>
        <Textarea rows={3} placeholder="Descripción breve de la tarea…" maxLength={1000} value={valores.tareaObservada} onChange={(e) => onCambiar("tareaObservada", e.target.value)} />
      </Field>
    </div>
  );
}
