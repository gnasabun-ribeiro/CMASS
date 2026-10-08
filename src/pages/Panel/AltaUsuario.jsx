import { useEffect, useMemo, useState } from "react";
import { ROLES } from "../../data/permisos.js";
import { filtrarColaboradores } from "../../lib/colaboradores.js";
import { crearUsuario, listarColaboradoresParaAlta } from "../../lib/usuarios.js";
import { Aviso, boton, campo, tarjeta } from "./ui.jsx";

const DOMINIO = "@ribeirosrl.com.ar";
const texto = (s) => String(s || "").toLowerCase();

export default function AltaUsuario({ usuarios, onCreado, onCerrar }) {
  const [colaboradores, setColaboradores] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(null);
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

  const sugerencias = useMemo(() => (colaboradores ? filtrarColaboradores(colaboradores, busqueda).slice(0, 8) : []), [colaboradores, busqueda]);

  const elegir = (c) => {
    setElegido(c);
    setCorreo(c.correo);
    setBusqueda(c.etiqueta);
    setError(null);
  };

  const correoLimpio = correo.trim().toLowerCase();
  const correoValido = /^[^\s@]+@[^\s@]+$/.test(correoLimpio) && correoLimpio.endsWith(DOMINIO);
  const correoRepetido = correosConUsuario.has(correoLimpio);
  const puedeCrear = elegido && correoValido && !correoRepetido && !enviando;

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await crearUsuario({ nombre: elegido.etiqueta, correo: correoLimpio, rol, base: elegido.base, legajo: elegido.legajo });
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
      <div style={{ ...tarjeta, marginBottom: 14 }}>
        <div className="heading" style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Usuario creado</div>
        <div style={{ fontSize: 13.5, marginBottom: 10, overflowWrap: "anywhere" }}>
          <b>{resultado.usuario.nombre}</b> ({resultado.usuario.correo}) ya puede ingresar.
        </div>
        <div style={{ fontSize: 12.5, color: "var(--card-desc, var(--muted))", marginBottom: 4 }}>Contraseña temporal</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".05em", background: "rgba(127,127,127,.15)", padding: "8px 12px", borderRadius: 10, userSelect: "all" }}>
            {resultado.claveTemporal}
          </code>
          <button onClick={copiar} style={boton(false)}>{copiado ? "Copiada" : "Copiar"}</button>
        </div>
        <Aviso tipo="aviso">
          Se muestra una sola vez: pasásela a la persona por un canal privado. Al ingresar, la app le pide elegir una contraseña propia.
        </Aviso>
        <div style={{ fontSize: 12.5, color: "var(--card-desc, var(--muted))", marginBottom: 10 }}>
          {resultado.correoGuardadoEnColaboradores
            ? "El correo quedó guardado también en la lista de colaboradores."
            : "El correo ya figuraba en la lista de colaboradores."}
        </div>
        <button onClick={onCerrar} style={boton(true)}>Listo</button>
      </div>
    );
  }

  return (
    <div style={{ ...tarjeta, marginBottom: 14 }}>
      <div className="heading" style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Agregar usuario</div>

      <label htmlFor="alta-busqueda" style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
        Buscar en la lista de colaboradores
      </label>
      <input
        id="alta-busqueda"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setElegido(null);
          setCorreo("");
        }}
        placeholder="Nombre y apellido"
        autoComplete="off"
        style={{ ...campo, width: "100%" }}
      />
      {errorCarga ? <Aviso>{errorCarga}</Aviso> : null}
      {!colaboradores && !errorCarga ? <div style={{ fontSize: 12.5, color: "var(--card-desc, var(--muted))", marginTop: 6 }}>Cargando colaboradores…</div> : null}

      {!elegido && sugerencias.length > 0 ? (
        <div role="listbox" style={{ display: "grid", gap: 4, marginTop: 8 }}>
          {sugerencias.map((c) => (
            <button
              key={c.clave}
              role="option"
              onClick={() => elegir(c)}
              disabled={yaTieneUsuario(c)}
              style={{ ...campo, textAlign: "left", cursor: yaTieneUsuario(c) ? "default" : "pointer", opacity: yaTieneUsuario(c) ? 0.6 : 1 }}
            >
              <b>{c.etiqueta}</b>
              <span style={{ display: "block", fontSize: 12, color: "#6a6280" }}>
                {yaTieneUsuario(c) ? "Ya tiene usuario" : c.correo || "Sin correo corporativo"}
                {c.funcion ? ` · ${c.funcion}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {!elegido && busqueda.trim() && colaboradores && sugerencias.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--card-desc, var(--muted))", marginTop: 8 }}>No hay colaboradores con ese nombre.</div>
      ) : null}

      {elegido ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <label htmlFor="alta-correo" style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
              Correo corporativo {elegido.correo ? "" : "(no tiene cargado: asignale uno, queda guardado en la lista)"}
            </label>
            <input
              id="alta-correo"
              type="email"
              value={correo}
              readOnly={Boolean(elegido.correo)}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder={`nombre.apellido${DOMINIO}`}
              style={{ ...campo, width: "100%" }}
            />
            {correo && !correoValido ? <div style={{ fontSize: 12, color: "var(--danger-fg)", marginTop: 4, fontWeight: 600 }}>El correo tiene que terminar en {DOMINIO}.</div> : null}
            {correoRepetido ? <div style={{ fontSize: 12, color: "var(--danger-fg)", marginTop: 4, fontWeight: 600 }}>Ya hay un usuario con ese correo.</div> : null}
          </div>
          <div>
            <label htmlFor="alta-rol" style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Rol</label>
            <select id="alta-rol" value={rol} onChange={(e) => setRol(e.target.value)} style={{ ...campo, width: "100%" }}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "var(--card-desc, var(--muted))", marginTop: 4 }}>{ROLES.find((r) => r.value === rol)?.desc}</div>
          </div>
        </div>
      ) : null}

      {error ? <Aviso>{error}</Aviso> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={crear} disabled={!puedeCrear} style={{ ...boton(true), opacity: puedeCrear ? 1 : 0.5, cursor: puedeCrear ? "pointer" : "default" }}>
          {enviando ? "Creando…" : "Crear usuario"}
        </button>
        <button onClick={onCerrar} disabled={enviando} style={boton(false)}>Cancelar</button>
      </div>
    </div>
  );
}
