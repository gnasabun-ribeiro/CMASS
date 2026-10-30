import { useEffect, useMemo, useState } from "react";
import { ROLES } from "../../data/permisos.js";
import { buscarColaboradores } from "../../lib/colaboradores.js";
import { crearUsuario, listarColaboradoresParaAlta } from "../../lib/usuarios.js";
import { Aviso, tarjeta, textoTarjeta } from "../Panel/ui.jsx";
import Icon from "../../components/Icon.jsx";
import Button from "../../components/ui/Button.jsx";
import { Skeleton } from "../../components/ui/EmptyState.jsx";
import { Field, Input } from "../../components/ui/Field.jsx";
import { Select } from "../../components/ui/Select.jsx";

const DOMINIO = "@ribeirosrl.com.ar";
const MAX_SUGERENCIAS = 8;
const texto = (s) => String(s || "").toLowerCase();
const limpiar = (s) => String(s || "").trim().replace(/\s+/g, " ");

const nota = textoTarjeta;

// La persona se busca en la lista de colaboradores (DW). Si está y no tiene correo
// corporativo, se le asigna uno; si no está, se cargan a mano nombre, apellido y correo
// (eso no se agrega a la lista de colaboradores, que se repuebla entera desde el DW).
export default function AltaUsuario({ usuarios, onCreado, onCerrar }) {
  const [colaboradores, setColaboradores] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(null);
  const [manual, setManual] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("inspector");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    listarColaboradoresParaAlta()
      .then(setColaboradores)
      .catch((e) => setErrorCarga(e.message || "No se pudo leer la lista de colaboradores"));
  }, []);

  const correosConUsuario = useMemo(() => new Set(usuarios.map((u) => texto(u.email))), [usuarios]);
  const yaTieneUsuario = (c) => c.correo && correosConUsuario.has(texto(c.correo));

  // Incluye a quien coincide exactamente con lo escrito: si no apareciera, se lo cargaría a mano repetido.
  const coincidencias = useMemo(() => (colaboradores ? buscarColaboradores(colaboradores, busqueda) : []), [colaboradores, busqueda]);
  const sugerencias = coincidencias.slice(0, MAX_SUGERENCIAS);

  const elegir = (c) => {
    setElegido(c);
    setCorreo(c.correo);
    setBusqueda(c.etiqueta);
    setError(null);
  };

  // Lo escrito en la búsqueda se usa de punto de partida ("Nombre Apellido", como en la lista).
  const cargarAMano = () => {
    const [primero = "", ...resto] = limpiar(busqueda).split(" ");
    setManual(true);
    setElegido(null);
    setNombre(primero);
    setApellido(resto.join(" "));
    setCorreo("");
    setError(null);
  };

  const volverABuscar = () => {
    setManual(false);
    setCorreo("");
    setError(null);
  };

  const correoLimpio = correo.trim().toLowerCase();
  const correoValido = /^[^\s@]+@[^\s@]+$/.test(correoLimpio) && correoLimpio.endsWith(DOMINIO);
  const correoRepetido = correosConUsuario.has(correoLimpio);
  const nombreCompleto = manual ? limpiar(`${nombre} ${apellido}`) : elegido?.etiqueta;
  const personaLista = manual ? Boolean(limpiar(nombre) && limpiar(apellido)) : Boolean(elegido);
  const puedeCrear = personaLista && correoValido && !correoRepetido && !enviando;
  // Lo que falta completar, para decirlo en vez de solo apagar el botón.
  const faltan = [
    manual && !limpiar(nombre) && "el nombre",
    manual && !limpiar(apellido) && "el apellido",
    (elegido || manual) && !correoLimpio && "el correo",
  ].filter(Boolean);
  const textoFaltan = faltan.length
    ? `${faltan.length === 1 ? "Falta" : "Faltan"} ${faltan.length > 1 ? `${faltan.slice(0, -1).join(", ")} y ${faltan.at(-1)}` : faltan[0]}.`
    : null;

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await crearUsuario({
        nombre: nombreCompleto,
        correo: correoLimpio,
        rol,
        base: manual ? null : elegido.base,
        legajo: manual ? null : elegido.legajo,
      });
      setResultado(r);
      onCreado();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resultado.claveTemporal);
      setCopiado(true);
    } catch {
      setCopiado(false); // sin permiso del navegador: la contraseña igual está a la vista para copiarla a mano
    }
  };

  if (resultado) {
    return (
      <section className="en-card" style={{ ...tarjeta, marginBottom: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
        <h2 className="t-headline" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ color: "var(--success-fg)", display: "inline-flex" }}>
            <Icon name="checkCircle" size={20} />
          </span>
          Usuario creado
        </h2>
        <p className="t-callout" style={{ overflowWrap: "anywhere" }}>
          <b>{resultado.usuario.nombre}</b> ({resultado.usuario.correo}) ya puede ingresar.
        </p>
        <div>
          <div className="t-footnote" style={{ ...nota, marginBottom: "var(--space-1)" }}>
            Contraseña temporal
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-headline)",
                fontWeight: "var(--weight-bold)",
                letterSpacing: ".05em",
                background: "rgba(127,127,127,.15)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                userSelect: "all",
              }}
            >
              {resultado.claveTemporal}
            </code>
            <Button size="sm" icon={copiado ? "check" : undefined} onClick={copiar}>
              {copiado ? "Copiada" : "Copiar"}
            </Button>
          </div>
        </div>
        <Aviso tipo="aviso">
          Se muestra una sola vez: pasásela a la persona por un canal privado. Al ingresar, la app le pide elegir una contraseña propia.
        </Aviso>
        <p className="t-footnote" style={nota}>
          {manual
            ? "La persona no figura en la lista de colaboradores: el nombre y el correo quedan guardados solo en su usuario."
            : resultado.correoGuardadoEnColaboradores
              ? "El correo quedó guardado también en la lista de colaboradores."
              : "El correo ya figuraba en la lista de colaboradores."}
        </p>
        <div>
          <Button variant="solid" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="en-card" style={{ ...tarjeta, marginBottom: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <h2 className="t-headline">Agregar usuario</h2>

      {manual ? (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <p className="t-footnote" style={nota}>
            Datos de una persona que no está en la lista de colaboradores.{" "}
            <button type="button" onClick={volverABuscar} className="link-btn">
              Volver a buscar en la lista
            </button>
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: "var(--space-3)" }}>
            <Field label="Nombre" id="alta-nombre">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" autoCapitalize="words" />
            </Field>
            <Field label="Apellido" id="alta-apellido">
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="off" autoCapitalize="words" />
            </Field>
          </div>
        </div>
      ) : (
        <div>
          <Field label="Buscar en la lista de colaboradores" id="alta-busqueda">
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setElegido(null);
                setCorreo("");
              }}
              placeholder="Nombre y apellido"
              autoComplete="off"
              aria-controls={!elegido && sugerencias.length ? "alta-sugerencias" : undefined}
            />
          </Field>
          {errorCarga ? <Aviso>{errorCarga}</Aviso> : null}
          {!colaboradores && !errorCarga ? (
            <div aria-busy="true" style={{ display: "grid", gap: "var(--space-1-5)", marginTop: "var(--space-2)" }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : null}

          {!elegido && sugerencias.length > 0 ? (
            <ul id="alta-sugerencias" role="listbox" aria-label="Colaboradores" style={{ listStyle: "none", margin: "var(--space-2) 0 0", padding: 0, display: "grid", gap: "var(--space-1)" }}>
              {sugerencias.map((c) => {
                const tiene = yaTieneUsuario(c);
                return (
                  <li key={c.clave} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-disabled={tiene || undefined}
                      onClick={() => !tiene && elegir(c)}
                      className="field"
                      style={{ textAlign: "left", cursor: tiene ? "not-allowed" : "pointer", opacity: tiene ? 0.6 : 1, minHeight: "var(--touch-min)" }}
                    >
                      <b>{c.etiqueta}</b>
                      <span className="t-caption" style={{ display: "block", color: "var(--text-tertiary)" }}>
                        {tiene ? "Ya tiene usuario" : c.correo || "Sin correo corporativo"}
                        {c.funcion ? ` · ${c.funcion}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
              {coincidencias.length > MAX_SUGERENCIAS ? (
                <li className="t-footnote" style={nota}>
                  Hay {coincidencias.length - MAX_SUGERENCIAS} más: escribí más del nombre para encontrarla.
                </li>
              ) : null}
            </ul>
          ) : null}
          {!elegido && busqueda.trim() && colaboradores && sugerencias.length === 0 ? (
            <p className="t-footnote" style={{ ...nota, marginTop: "var(--space-2)" }}>
              No hay colaboradores con ese nombre.
            </p>
          ) : null}
          {!elegido && (busqueda.trim() || errorCarga) ? (
            <p className="t-footnote" style={{ ...nota, marginTop: "var(--space-2)" }}>
              ¿No está en la lista?{" "}
              <button type="button" onClick={cargarAMano} className="link-btn">
                Cargar nombre, apellido y correo
              </button>
            </p>
          ) : null}
        </div>
      )}

      {elegido || manual ? (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <Field
            id="alta-correo"
            label={`Correo corporativo${elegido && !elegido.correo ? " (no tiene cargado: asignale uno, queda guardado en la lista)" : ""}`}
            error={correo && !correoValido ? `El correo tiene que terminar en ${DOMINIO}.` : correoRepetido ? "Ya hay un usuario con ese correo." : null}
          >
            <Input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={correo}
              readOnly={Boolean(elegido?.correo)}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder={`nombre.apellido${DOMINIO}`}
            />
          </Field>
          <Field id="alta-rol" label="Rol" hint={ROLES.find((r) => r.value === rol)?.desc}>
            <Select titulo="Rol" options={ROLES.map((r) => ({ value: r.value, label: r.label, description: r.desc }))} value={rol} onChange={setRol} />
          </Field>
        </div>
      ) : null}

      {error ? <Aviso>{error}</Aviso> : null}
      {textoFaltan ? (
        <p className="t-footnote" style={{ ...nota, fontWeight: "var(--weight-semibold)" }}>
          {textoFaltan}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant="solid" onClick={crear} disabled={!puedeCrear} loading={enviando}>
          {enviando ? "Creando…" : "Crear usuario"}
        </Button>
        <Button onClick={onCerrar} disabled={enviando}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
