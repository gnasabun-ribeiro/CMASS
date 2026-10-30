import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon.jsx";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { usePresencia } from "./usePresencia.js";
import { CONSULTA_CELULAR, useMediaQuery } from "../../lib/breakpoints.js";
import { normalizar } from "../../lib/texto.js";

/* =====================================================================================
   Selectores con el mismo aspecto en todos los navegadores (reemplazan a <select>).

   Opciones (`options`): strings, u objetos { value, label, description?, icon?, disabled? };
   grupos { type: "group", label, options: [...] } y separadores { type: "separator" }.

   <Select>      una opción.            onChange(value, opcion)
   <Combobox>    una opción, con búsqueda (listas largas: más de ~8).
   <MultiSelect> varias, como chips que se quitan con ×.   onChange(values[], opcion)

   Props comunes: value / defaultValue (controlado o no), onChange, options, placeholder,
   icono (solo Select: ícono fijo adelante del valor),
   name (input oculto para enviar un <form>; MultiSelect manda uno por valor), id (para
   <label htmlFor> o <Field>), disabled, invalid (o aria-invalid), size (sm | md | lg),
   variant ("papel": renglón de la Tarjeta TOP), titulo (título de la hoja del celular),
   aria-label / aria-labelledby / aria-describedby, className, style.
   Combobox y MultiSelect: vacio ("Sin resultados"), filtrar(opcion, consulta) → boolean,
   placeholderBusqueda.

   Ejemplo:
     <Field label="Rol"><Select options={ROLES} value={rol} onChange={setRol} /></Field>
     <Combobox options={clientes} value={cliente} onChange={setCliente} placeholder="Seleccioná un cliente" />
     <MultiSelect options={SEVERIDADES} value={sev} onChange={setSev} placeholder="Toda severidad" />

   En la computadora el menú es un popover en un portal (no lo corta ningún overflow), se
   abre hacia arriba si abajo no hay lugar, toma el ancho del campo y se reacomoda al hacer
   scroll o cambiar el tamaño. En el celular (< 640 px) se abre como hoja desde abajo, con
   opciones de 52 px: el <select> nativo no tiene búsqueda (Cliente tiene 180 centros) y en
   iOS la rueda es incómoda con listas largas; así se ve y se usa igual en todos lados.

   Teclado (patrón ARIA combobox + listbox): ↑ ↓ mueven, Inicio/Fin, RePág/AvPág (de a 10),
   Enter o Espacio eligen, Escape cierra (el foco vuelve al campo), escribir salta a la
   opción que empieza así (Select). Más de 200 opciones se virtualizan.
   ===================================================================================== */

const UMBRAL_VIRTUAL = 200;
const MAX_ALTO_MENU = 320;

// ---------- Opciones ----------
function aplanar(options = []) {
  const items = [];
  const agregar = (o, grupo) => {
    if (o == null) return;
    if (o.type === "separator") items.push({ tipo: "separador", key: `sep-${items.length}` });
    else if (o.type === "group" || Array.isArray(o.options)) {
      items.push({ tipo: "grupo", label: o.label, key: `grupo-${items.length}` });
      o.options.forEach((x) => agregar(x, o.label));
    } else if (typeof o !== "object") items.push({ tipo: "opcion", value: o, label: String(o), key: `op-${o}`, grupo });
    else
      items.push({
        tipo: "opcion",
        value: o.value,
        label: o.label ?? String(o.value),
        description: o.description,
        icon: o.icon,
        disabled: Boolean(o.disabled),
        key: `op-${o.value}`,
        grupo,
      });
  };
  options.forEach((o) => agregar(o));
  return items;
}

function filtrarItems(items, consulta, filtrar) {
  const q = normalizar(consulta);
  if (!q) return items;
  const coincide = filtrar ? (o) => filtrar(o, consulta) : (o) => normalizar(`${o.label} ${o.description ?? ""}`).includes(q);
  const res = [];
  let grupo = null;
  for (const it of items) {
    if (it.tipo === "grupo") grupo = it;
    else if (it.tipo === "opcion" && coincide(it)) {
      if (grupo) {
        res.push(grupo);
        grupo = null;
      }
      res.push(it);
    }
  }
  return res;
}

const primera = (ops) => ops.findIndex((o) => !o.disabled);
const ultima = (ops) => {
  for (let i = ops.length - 1; i >= 0; i--) if (!ops[i].disabled) return i;
  return -1;
};

// Avanza `paso` lugares salteando las deshabilitadas, sin dar la vuelta.
function mover(ops, desde, paso) {
  if (!ops.length) return -1;
  if (desde < 0) return paso > 0 ? primera(ops) : ultima(ops);
  const destino = Math.min(ops.length - 1, Math.max(0, desde + paso));
  const dir = Math.sign(paso);
  for (let i = destino; i >= 0 && i < ops.length; i += dir) if (!ops[i].disabled) return i;
  for (let i = destino; i >= 0 && i < ops.length; i -= dir) if (!ops[i].disabled) return i;
  return desde;
}

// Escribir para saltar: letras seguidas buscan el prefijo; la misma letra repetida recorre
// las que empiezan con ella.
function useTypeahead() {
  const buffer = useRef("");
  const timer = useRef(null);
  return (tecla, ops, desde) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (buffer.current = ""), 600);
    buffer.current += tecla.toLowerCase();
    const repetida = [...buffer.current].every((c) => c === buffer.current[0]);
    const q = normalizar(repetida ? buffer.current[0] : buffer.current);
    const n = ops.length;
    const inicio = repetida || desde < 0 ? desde + 1 : desde;
    for (let k = 0; k < n; k++) {
      const i = (((inicio + k) % n) + n) % n;
      if (!ops[i].disabled && normalizar(ops[i].label).startsWith(q)) return i;
    }
    return -1;
  };
}

// Teclas de navegación de la lista. Devuelve true si la atendió.
function navegar(e, { ops, activa, setActiva, elegir, cerrar, conInicioFin = true, conEspacio = true }) {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setActiva(mover(ops, activa, 1));
      return true;
    case "ArrowUp":
      e.preventDefault();
      setActiva(mover(ops, activa, -1));
      return true;
    case "PageDown":
      e.preventDefault();
      setActiva(mover(ops, activa, 10));
      return true;
    case "PageUp":
      e.preventDefault();
      setActiva(mover(ops, activa, -10));
      return true;
    case "Home":
      if (!conInicioFin) return false;
      e.preventDefault();
      setActiva(primera(ops));
      return true;
    case "End":
      if (!conInicioFin) return false;
      e.preventDefault();
      setActiva(ultima(ops));
      return true;
    case "Enter":
      if (activa < 0 || !ops[activa]) return false;
      e.preventDefault();
      elegir(ops[activa]);
      return true;
    case " ":
      if (!conEspacio || activa < 0 || !ops[activa]) return false;
      e.preventDefault();
      elegir(ops[activa]);
      return true;
    case "Escape":
      e.preventDefault();
      e.stopPropagation();
      cerrar();
      return true;
    default:
      return false;
  }
}

// ---------- Posición del menú (popover) ----------
function usePosicion(anclaRef, activo) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!activo) return undefined;
    const calcular = () => {
      const el = anclaRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const anchoVista = document.documentElement.clientWidth;
      const altoVista = window.innerHeight;
      const margen = 8;
      const separacion = 6;
      const libreAbajo = altoVista - r.bottom - separacion - margen;
      const libreArriba = r.top - separacion - margen;
      const arriba = libreAbajo < Math.min(MAX_ALTO_MENU, 220) && libreArriba > libreAbajo;
      const alto = Math.max(120, Math.min(MAX_ALTO_MENU, arriba ? libreArriba : libreAbajo));
      const ancho = Math.min(r.width, anchoVista - margen * 2);
      const left = Math.min(Math.max(margen, r.left), anchoVista - ancho - margen);
      setPos({
        lado: arriba ? "arriba" : "abajo",
        estilo: { left, width: ancho, maxHeight: alto, ...(arriba ? { bottom: altoVista - r.top + separacion } : { top: r.bottom + separacion }) },
      });
    };
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [activo, anclaRef]);
  return pos;
}

// Cierra al tocar fuera del campo y del menú.
function useClicAfuera(activo, refs, alSalir) {
  const alSalirRef = useRef(alSalir);
  alSalirRef.current = alSalir;
  useEffect(() => {
    if (!activo) return undefined;
    const alApoyar = (e) => {
      if (refs.some((r) => r.current?.contains(e.target))) return;
      alSalirRef.current();
    };
    document.addEventListener("pointerdown", alApoyar, true);
    return () => document.removeEventListener("pointerdown", alApoyar, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}

const idOpcion = (idLista, i) => `${idLista}-op-${i}`;
const esTactil = () => window.matchMedia("(pointer: coarse)").matches;

// ---------- Lista (compartida por los tres) ----------
function Lista({ idLista, items, activa, setActiva, esElegida, multiple, onElegir, vacio, listaRef, etiqueta, ...props }) {
  const ops = useMemo(() => items.filter((i) => i.tipo === "opcion"), [items]);
  const indice = useMemo(() => new Map(ops.map((o, i) => [o.key, i])), [ops]);
  const virtual = ops.length > UMBRAL_VIRTUAL && ops.length === items.length;
  const [scroll, setScroll] = useState(0);
  const [altoFila, setAltoFila] = useState(40);
  const [altoVista, setAltoVista] = useState(MAX_ALTO_MENU);

  useLayoutEffect(() => {
    if (!virtual) return;
    const lista = listaRef.current;
    const fila = lista?.querySelector(".opcion");
    if (fila?.offsetHeight) setAltoFila(fila.offsetHeight);
    if (lista?.clientHeight) setAltoVista(lista.clientHeight);
  }, [virtual, listaRef]);

  // La opción activa siempre a la vista.
  useEffect(() => {
    if (activa < 0) return;
    const lista = listaRef.current;
    if (!lista) return;
    if (virtual) {
      const arriba = activa * altoFila;
      if (arriba < lista.scrollTop) lista.scrollTop = arriba;
      else if (arriba + altoFila > lista.scrollTop + lista.clientHeight) lista.scrollTop = arriba + altoFila - lista.clientHeight;
    } else document.getElementById(idOpcion(idLista, activa))?.scrollIntoView({ block: "nearest" });
  }, [activa, virtual, altoFila, idLista, listaRef]);

  if (!items.length) return <div className="listbox__vacio">{vacio}</div>;

  let desde = 0;
  let hasta = items.length;
  if (virtual) {
    desde = Math.max(0, Math.floor(scroll / altoFila) - 8);
    hasta = Math.min(items.length, Math.ceil((scroll + altoVista) / altoFila) + 8);
  }

  return (
    <ul
      ref={listaRef}
      id={idLista}
      role="listbox"
      aria-label={etiqueta}
      aria-multiselectable={multiple || undefined}
      className="listbox"
      onScroll={virtual ? (e) => setScroll(e.currentTarget.scrollTop) : undefined}
      {...props}
    >
      {virtual ? <li role="presentation" style={{ height: desde * altoFila }} /> : null}
      {items.slice(desde, hasta).map((it) => {
        if (it.tipo === "grupo")
          return (
            <li key={it.key} role="presentation" className="listbox__grupo">
              {it.label}
            </li>
          );
        if (it.tipo === "separador") return <li key={it.key} role="separator" className="listbox__separador" />;
        const i = indice.get(it.key);
        const elegida = esElegida(it.value);
        return (
          <li
            key={it.key}
            id={idOpcion(idLista, i)}
            role="option"
            aria-selected={elegida}
            aria-disabled={it.disabled || undefined}
            data-activa={i === activa || undefined}
            className="opcion"
            onMouseDown={(e) => e.preventDefault()} // el foco se queda en el campo
            onPointerMove={() => i !== activa && !it.disabled && setActiva(i)}
            onClick={() => !it.disabled && onElegir(it)}
          >
            {multiple ? (
              <span className="opcion__casilla" aria-hidden="true">
                <Icon name="check" size={14} strokeWidth={3} />
              </span>
            ) : null}
            {it.icon ? (
              <span className="opcion__icono" aria-hidden="true">
                <Icon name={it.icon} size={20} />
              </span>
            ) : null}
            <span className="opcion__texto">
              <span className="opcion__etiqueta">{it.label}</span>
              {it.description ? <span className="opcion__descripcion">{it.description}</span> : null}
            </span>
            {!multiple ? (
              <span className="opcion__check" aria-hidden="true">
                <Icon name="check" size={16} />
              </span>
            ) : null}
          </li>
        );
      })}
      {virtual ? <li role="presentation" style={{ height: (items.length - hasta) * altoFila }} /> : null}
    </ul>
  );
}

function Menu({ abierto, anclaRef, menuRef, children }) {
  const { montado, estado } = usePresencia(abierto, 150);
  const pos = usePosicion(anclaRef, montado);
  if (!montado || !pos) return null;
  return createPortal(
    <div ref={menuRef} className="popover" data-estado={estado} data-lado={pos.lado} style={pos.estilo}>
      {children}
    </div>,
    document.body
  );
}

function Buscador({ inputRef, value, onChange, onKeyDown, placeholder, idLista, activa, abierto }) {
  return (
    <div className="sheet__buscador">
      <div className="field combo">
        <span style={{ display: "inline-flex", paddingLeft: "var(--space-3)", color: "var(--text-tertiary)" }} aria-hidden="true">
          <Icon name="search" size={16} />
        </span>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={activa >= 0 ? idOpcion(idLista, activa) : undefined}
          aria-label={placeholder}
          className="combo__input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}

const claseCampo = (size, variant, className, extra) =>
  ["field", extra, size && size !== "md" && `field--${size}`, variant && `field--${variant}`, className].filter(Boolean).join(" ");

function Chevron() {
  return (
    <span className="select-trigger__chevron" aria-hidden="true">
      <Icon name="chevronDown" size={16} />
    </span>
  );
}

function useValor(value, defaultValue, vacio) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(defaultValue ?? vacio);
  return [controlado ? value : interno, (v) => !controlado && setInterno(v)];
}

// =====================================================================================
// Select
// =====================================================================================
export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Elegí una opción",
  name,
  id,
  disabled,
  invalid,
  size,
  variant,
  titulo,
  icono, // ícono fijo adelante del valor (ej. "palette" en el selector de tema)
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}) {
  const [actual, setActual] = useValor(value, defaultValue, null);
  const items = useMemo(() => aplanar(options), [options]);
  const ops = useMemo(() => items.filter((i) => i.tipo === "opcion"), [items]);
  const elegida = ops.find((o) => o.value === actual);
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listaRef = useRef(null);
  const auto = useId();
  const idTrigger = id || `select-${auto}`;
  const idLista = `${idTrigger}-lista`;
  const typeahead = useTypeahead();

  const abrir = (indice) => {
    if (disabled) return;
    const sel = ops.indexOf(elegida);
    setActiva(indice ?? (sel >= 0 ? sel : primera(ops)));
    setAbierto(true);
  };
  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco && !celular) triggerRef.current?.focus();
  };
  const elegir = (op) => {
    if (op.disabled) return;
    setActual(op.value);
    if (op.value !== actual) onChange?.(op.value, op);
    cerrar();
  };

  useClicAfuera(abierto && !celular, [triggerRef, menuRef], () => cerrar(false));

  const alTeclear = (e) => {
    if (disabled) return;
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir(e.key === "ArrowUp" && !elegida ? ultima(ops) : undefined);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        abrir(e.key === "Home" ? primera(ops) : ultima(ops));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = typeahead(e.key, ops, ops.indexOf(elegida));
        if (i >= 0) abrir(i);
      }
      return;
    }
    if (e.key === "Tab") {
      if (activa >= 0 && ops[activa] && !ops[activa].disabled && ops[activa].value !== actual) {
        setActual(ops[activa].value);
        onChange?.(ops[activa].value, ops[activa]);
      }
      setAbierto(false);
      return;
    }
    if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const i = typeahead(e.key, ops, activa);
      if (i >= 0) setActiva(i);
      return;
    }
    navegar(e, { ops, activa, setActiva, elegir, cerrar });
  };

  const lista = (
    <Lista
      idLista={idLista}
      items={items}
      activa={activa}
      setActiva={setActiva}
      esElegida={(v) => v === actual}
      onElegir={elegir}
      vacio="Sin opciones"
      listaRef={listaRef}
      etiqueta={titulo || ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...(celular && {
        tabIndex: 0,
        "aria-activedescendant": activa >= 0 ? idOpcion(idLista, activa) : undefined,
        onKeyDown: (e) => {
          if (e.key.length === 1 && e.key !== " ") {
            const i = typeahead(e.key, ops, activa);
            if (i >= 0) setActiva(i);
          } else navegar(e, { ops, activa, setActiva, elegir, cerrar });
        },
      })}
    />
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={idTrigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={abierto && !celular && activa >= 0 ? idOpcion(idLista, activa) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-invalid={invalid || ariaInvalid || undefined}
        disabled={disabled}
        className={claseCampo(size, variant, className, "select-trigger sin-hover")}
        style={style}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
      >
        {icono || elegida?.icon ? (
          <span style={{ display: "inline-flex", color: "var(--text-tertiary)" }} aria-hidden="true">
            <Icon name={icono || elegida.icon} size={16} />
          </span>
        ) : null}
        <span className="select-trigger__valor" data-vacio={!elegida || undefined}>
          {elegida ? elegida.label : placeholder}
        </span>
        <Chevron />
      </button>
      {name ? <input type="hidden" name={name} value={actual ?? ""} /> : null}
      {celular ? (
        <Sheet abierto={abierto} onCerrar={() => cerrar(false)} titulo={titulo || ariaLabel || placeholder} focoInicial={listaRef} cuerpoClassName="sheet__cuerpo--sin-padding">
          {lista}
        </Sheet>
      ) : (
        <Menu abierto={abierto} anclaRef={triggerRef} menuRef={menuRef}>
          {lista}
        </Menu>
      )}
    </>
  );
}

// =====================================================================================
// Combobox (una opción, con búsqueda)
// =====================================================================================
export function Combobox({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Elegí una opción",
  placeholderBusqueda = "Buscar…",
  vacio = "Sin resultados",
  filtrar,
  name,
  id,
  disabled,
  invalid,
  size,
  variant,
  titulo,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}) {
  const [actual, setActual] = useValor(value, defaultValue, null);
  const items = useMemo(() => aplanar(options), [options]);
  const elegida = useMemo(() => items.find((o) => o.tipo === "opcion" && o.value === actual), [items, actual]);
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState(null); // null: se muestra la opción elegida
  const [activa, setActiva] = useState(-1);
  const filtrados = useMemo(() => filtrarItems(items, consulta ?? "", filtrar), [items, consulta, filtrar]);
  const ops = useMemo(() => filtrados.filter((i) => i.tipo === "opcion"), [filtrados]);
  const campoRef = useRef(null);
  const inputRef = useRef(null);
  const buscadorRef = useRef(null);
  const menuRef = useRef(null);
  const listaRef = useRef(null);
  const auto = useId();
  const idCampo = id || `combo-${auto}`;
  const idLista = `${idCampo}-lista`;

  const abrir = () => {
    if (disabled) return;
    const sel = ops.findIndex((o) => o.value === actual);
    setActiva(sel >= 0 ? sel : primera(ops));
    setAbierto(true);
  };
  const cerrar = () => {
    setAbierto(false);
    setConsulta(null);
  };
  const elegir = (op) => {
    if (op.disabled) return;
    setActual(op.value);
    if (op.value !== actual) onChange?.(op.value, op);
    cerrar();
    if (!celular) inputRef.current?.focus();
  };
  const buscar = (texto) => {
    setConsulta(texto);
    setAbierto(true);
    const nuevos = filtrarItems(items, texto, filtrar).filter((i) => i.tipo === "opcion");
    setActiva(primera(nuevos));
  };

  useClicAfuera(abierto && !celular, [campoRef, menuRef], cerrar);

  const alTeclear = (e) => {
    if (!abierto && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      abrir();
      return;
    }
    if (!abierto) return;
    if (e.key === "Tab") {
      cerrar();
      return;
    }
    navegar(e, { ops, activa, setActiva, elegir, cerrar, conInicioFin: false, conEspacio: false });
  };

  const lista = (
    <Lista
      idLista={idLista}
      items={filtrados}
      activa={activa}
      setActiva={setActiva}
      esElegida={(v) => v === actual}
      onElegir={elegir}
      vacio={vacio}
      listaRef={listaRef}
      etiqueta={titulo || ariaLabel}
      aria-labelledby={ariaLabelledby}
    />
  );

  if (celular) {
    return (
      <>
        <button
          ref={campoRef}
          type="button"
          id={idCampo}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={invalid || ariaInvalid || undefined}
          disabled={disabled}
          className={claseCampo(size, variant, className, "select-trigger sin-hover")}
          style={style}
          onClick={abrir}
        >
          <span className="select-trigger__valor" data-vacio={!elegida || undefined}>
            {elegida ? elegida.label : placeholder}
          </span>
          <Chevron />
        </button>
        {name ? <input type="hidden" name={name} value={actual ?? ""} /> : null}
        <Sheet
          abierto={abierto}
          onCerrar={cerrar}
          titulo={titulo || ariaLabel || placeholder}
          alto={items.length > 8}
          // Con teclado físico se escribe directo; en táctil no se abre el teclado de golpe
          // (taparía media lista): primero se ve la lista y se toca el buscador si hace falta.
          focoInicial={esTactil() ? undefined : buscadorRef}
          cuerpoClassName="sheet__cuerpo--sin-padding"
          encabezado={
            <Buscador
              inputRef={buscadorRef}
              value={consulta ?? ""}
              onChange={buscar}
              placeholder={placeholderBusqueda}
              idLista={idLista}
              activa={activa}
              abierto={abierto}
              onKeyDown={(e) => navegar(e, { ops, activa, setActiva, elegir, cerrar, conInicioFin: false, conEspacio: false })}
            />
          }
        >
          {lista}
        </Sheet>
      </>
    );
  }

  return (
    <>
      <div
        ref={campoRef}
        className={claseCampo(size, variant, className, "combo")}
        data-abierto={abierto || undefined}
        aria-disabled={disabled || undefined}
        style={style}
      >
        <input
          ref={inputRef}
          id={idCampo}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={abierto ? idLista : undefined}
          aria-activedescendant={abierto && activa >= 0 ? idOpcion(idLista, activa) : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={invalid || ariaInvalid || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="combo__input"
          placeholder={elegida ? elegida.label : placeholder}
          value={consulta ?? elegida?.label ?? ""}
          onChange={(e) => buscar(e.target.value)}
          onClick={() => !abierto && abrir()}
          onFocus={(e) => e.target.select()}
          onKeyDown={alTeclear}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          className="sin-hover"
          style={{ border: 0, background: "transparent", padding: "var(--space-1)", color: "inherit", display: "inline-flex" }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (abierto) cerrar();
            else {
              inputRef.current?.focus();
              abrir();
            }
          }}
        >
          <Chevron />
        </button>
      </div>
      {name ? <input type="hidden" name={name} value={actual ?? ""} /> : null}
      <Menu abierto={abierto} anclaRef={campoRef} menuRef={menuRef}>
        {lista}
      </Menu>
    </>
  );
}

// =====================================================================================
// MultiSelect (varias opciones, como chips)
// =====================================================================================
export function MultiSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Elegí una o más",
  placeholderBusqueda = "Buscar…",
  vacio = "Sin resultados",
  filtrar,
  buscable,
  name,
  id,
  disabled,
  invalid,
  size,
  titulo,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}) {
  const [actual, setActual] = useValor(value, defaultValue, []);
  const items = useMemo(() => aplanar(options), [options]);
  const todas = useMemo(() => items.filter((i) => i.tipo === "opcion"), [items]);
  const conBusqueda = buscable ?? todas.length > 8;
  const elegidas = actual.map((v) => todas.find((o) => o.value === v)).filter(Boolean);
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activa, setActiva] = useState(-1);
  const filtrados = useMemo(() => filtrarItems(items, consulta, filtrar), [items, consulta, filtrar]);
  const ops = useMemo(() => filtrados.filter((i) => i.tipo === "opcion"), [filtrados]);
  const campoRef = useRef(null);
  const inputRef = useRef(null);
  const buscadorRef = useRef(null);
  const menuRef = useRef(null);
  const listaRef = useRef(null);
  const auto = useId();
  const idCampo = id || `multi-${auto}`;
  const idLista = `${idCampo}-lista`;

  const cambiar = (nuevos, op) => {
    setActual(nuevos);
    onChange?.(nuevos, op);
  };
  const alternar = (op) => {
    if (op.disabled) return;
    cambiar(actual.includes(op.value) ? actual.filter((v) => v !== op.value) : [...actual, op.value], op);
    if (consulta) {
      setConsulta("");
      setActiva(todas.indexOf(op));
    }
  };
  const quitar = (op) => cambiar(actual.filter((v) => v !== op.value), op);
  const abrir = () => {
    if (disabled) return;
    setActiva(primera(ops));
    setAbierto(true);
  };
  const cerrar = () => {
    setAbierto(false);
    setConsulta("");
  };

  useClicAfuera(abierto && !celular, [campoRef, menuRef], cerrar);

  const alTeclear = (e) => {
    if (e.key === "Backspace" && !consulta && elegidas.length) {
      quitar(elegidas[elegidas.length - 1]);
      return;
    }
    if (!abierto && ["ArrowDown", "ArrowUp", "Enter", ...(conBusqueda ? [] : [" "])].includes(e.key)) {
      e.preventDefault();
      abrir();
      return;
    }
    if (!abierto) return;
    if (e.key === "Tab") {
      cerrar();
      return;
    }
    navegar(e, { ops, activa, setActiva, elegir: alternar, cerrar, conInicioFin: !conBusqueda, conEspacio: !conBusqueda });
  };

  const chips = elegidas.map((op) => (
    <span key={op.key} className="chip chip--accent">
      {op.label}
      <button
        type="button"
        className="chip__quitar sin-hover"
        aria-label={`Quitar ${op.label}`}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          quitar(op);
        }}
      >
        <Icon name="x" size={12} />
      </button>
    </span>
  ));

  const lista = (
    <Lista
      idLista={idLista}
      items={filtrados}
      activa={activa}
      setActiva={setActiva}
      esElegida={(v) => actual.includes(v)}
      multiple
      onElegir={alternar}
      vacio={vacio}
      listaRef={listaRef}
      etiqueta={titulo || ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...(celular &&
        !conBusqueda && {
          tabIndex: 0,
          "aria-activedescendant": activa >= 0 ? idOpcion(idLista, activa) : undefined,
          onKeyDown: (e) => navegar(e, { ops, activa, setActiva, elegir: alternar, cerrar }),
        })}
    />
  );

  const ocultos = name ? actual.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null;

  if (celular) {
    return (
      <>
        <div
          ref={campoRef}
          className={claseCampo(size, null, className, "multi")}
          aria-disabled={disabled || undefined}
          style={{ cursor: disabled ? "not-allowed" : "pointer", ...style }}
          onClick={(e) => !e.target.closest(".chip__quitar") && abrir()}
        >
          {chips}
          <button
            type="button"
            id={idCampo}
            aria-haspopup="dialog"
            aria-expanded={abierto}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby}
            aria-invalid={invalid || ariaInvalid || undefined}
            disabled={disabled}
            className="multi__placeholder sin-hover"
            style={{ border: 0, background: "transparent", textAlign: "left", minHeight: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span>{elegidas.length ? "" : placeholder}</span>
            <Chevron />
          </button>
        </div>
        {ocultos}
        <Sheet
          abierto={abierto}
          onCerrar={cerrar}
          titulo={titulo || ariaLabel || placeholder}
          alto={todas.length > 8}
          focoInicial={conBusqueda ? (esTactil() ? undefined : buscadorRef) : listaRef}
          cuerpoClassName="sheet__cuerpo--sin-padding"
          encabezado={
            conBusqueda ? (
              <Buscador
                inputRef={buscadorRef}
                value={consulta}
                onChange={(t) => {
                  setConsulta(t);
                  setActiva(0);
                }}
                placeholder={placeholderBusqueda}
                idLista={idLista}
                activa={activa}
                abierto={abierto}
                onKeyDown={(e) => navegar(e, { ops, activa, setActiva, elegir: alternar, cerrar, conInicioFin: false, conEspacio: false })}
              />
            ) : null
          }
          pie={
            <Button variant="solid" block onClick={cerrar}>
              Listo{actual.length ? ` (${actual.length})` : ""}
            </Button>
          }
        >
          {lista}
        </Sheet>
      </>
    );
  }

  return (
    <>
      <div
        ref={campoRef}
        className={claseCampo(size, null, className, "multi")}
        data-abierto={abierto || undefined}
        aria-disabled={disabled || undefined}
        style={{ cursor: disabled ? "not-allowed" : "text", ...style }}
        onClick={(e) => {
          if (e.target.closest(".chip__quitar")) return;
          inputRef.current?.focus();
          if (!abierto) abrir();
        }}
      >
        {chips}
        <input
          ref={inputRef}
          id={idCampo}
          type="text"
          role="combobox"
          aria-autocomplete={conBusqueda ? "list" : "none"}
          aria-expanded={abierto}
          aria-controls={abierto ? idLista : undefined}
          aria-activedescendant={abierto && activa >= 0 ? idOpcion(idLista, activa) : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={invalid || ariaInvalid || undefined}
          readOnly={!conBusqueda}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="combo__input"
          style={{ cursor: conBusqueda ? "text" : "pointer" }}
          placeholder={elegidas.length ? "" : placeholder}
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAbierto(true);
            setActiva(0);
          }}
          onKeyDown={alTeclear}
        />
        <Chevron />
      </div>
      {ocultos}
      <Menu abierto={abierto} anclaRef={campoRef} menuRef={menuRef}>
        {lista}
      </Menu>
    </>
  );
}
