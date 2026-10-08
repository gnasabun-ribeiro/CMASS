import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEVERIDADES } from "../../data/severidades.js";
import { rutaFormulario } from "../../data/modulos.js";
import { cambiarEstadoHallazgo } from "../../lib/panel.js";
import { Aviso, Chip, boton, campo, tarjeta } from "./ui.jsx";
import { nombreModulo } from "./Resumen.jsx";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "—");

function Hallazgo({ h, puedeCerrar, userId, onCambio }) {
  const navigate = useNavigate();
  const [cerrando, setCerrando] = useState(false);
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const sev = SEVERIDADES.find((s) => s.value === h.severidad) || SEVERIDADES[1];

  const cambiar = async (estado) => {
    setOcupado(true);
    setError(null);
    try {
      await cambiarEstadoHallazgo(h, estado, userId, nota);
      setCerrando(false);
      setNota("");
      onCambio(h.id, estado, estado === "cerrado" ? { cerradoAt: new Date().toISOString(), notaCierre: nota.trim() } : { cerradoAt: null, notaCierre: "" });
    } catch (e) {
      setError(e.message || "No se pudo guardar el cambio");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div style={{ ...tarjeta, opacity: h.estado === "cerrado" ? 0.8 : 1 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
        <Chip bg={sev.bg} fg={sev.fg}>{h.severidad}</Chip>
        {h.estado === "cerrado" ? <Chip bg="var(--success-bg)" fg="var(--success-fg)">Cerrado</Chip> : <Chip bg="var(--warn-bg)" fg="var(--warn-fg)">Abierto</Chip>}
        {h.vencido ? <Chip bg="var(--danger-bg)" fg="var(--danger-fg)">Vencido</Chip> : null}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{h.titulo}</div>
      {h.detalle ? <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3, overflowWrap: "anywhere" }}>{h.detalle}</div> : null}
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, display: "grid", gap: 2 }}>
        <span>{nombreModulo(h.moduloId, h.subId)} · {h.cliente || "Sin cliente"}{h.ubicacion ? ` · ${h.ubicacion}` : ""}</span>
        <span>Inspector: {h.inspector || "—"} · Responsable: {h.responsable || "Sin asignar"} · Vence: {fmt(h.vence)}</span>
        {h.estado === "cerrado" ? <span>Cerrado el {fmt(h.cerradoAt)}{h.notaCierre ? ` · ${h.notaCierre}` : ""}</span> : null}
      </div>

      {cerrando ? (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600 }} htmlFor={`nota-${h.id}`}>Nota de cierre (opcional)</label>
          <input id={`nota-${h.id}`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué se hizo para resolverlo" style={campo} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => cambiar("cerrado")} disabled={ocupado} style={boton(true)}>{ocupado ? "Guardando…" : "Confirmar cierre"}</button>
            <button onClick={() => setCerrando(false)} disabled={ocupado} style={boton(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {puedeCerrar && h.estado === "abierto" ? <button onClick={() => setCerrando(true)} style={boton(true)}>Cerrar hallazgo</button> : null}
          {puedeCerrar && h.estado === "cerrado" ? <button onClick={() => cambiar("abierto")} disabled={ocupado} style={boton(false)}>Reabrir</button> : null}
          <button onClick={() => navigate(rutaFormulario(h.moduloId, h.subId, h.inspeccionId))} style={boton(false)}>Ver inspección</button>
        </div>
      )}
      {error ? <Aviso>{error}</Aviso> : null}
    </div>
  );
}

export default function Hallazgos({ hallazgos, puedeCerrar, userId, onCambio }) {
  const [estado, setEstado] = useState("abierto");
  const [severidad, setSeveridad] = useState("");
  const [modulo, setModulo] = useState("");
  const [texto, setTexto] = useState("");

  const modulos = useMemo(() => [...new Set(hallazgos.map((h) => nombreModulo(h.moduloId, h.subId)))].sort(), [hallazgos]);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return hallazgos.filter(
      (h) =>
        (estado === "todos" || h.estado === estado) &&
        (!severidad || h.severidad === severidad) &&
        (!modulo || nombreModulo(h.moduloId, h.subId) === modulo) &&
        (!q || [h.titulo, h.detalle, h.cliente, h.responsable, h.inspector].some((v) => v.toLowerCase().includes(q)))
    );
  }, [hallazgos, estado, severidad, modulo, texto]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[["abierto", "Abiertos"], ["cerrado", "Cerrados"], ["todos", "Todos"]].map(([v, l]) => (
          <button key={v} onClick={() => setEstado(v)} style={boton(estado === v)}>{l}</button>
        ))}
        <select aria-label="Severidad" value={severidad} onChange={(e) => setSeveridad(e.target.value)} style={campo}>
          <option value="">Toda severidad</option>
          {SEVERIDADES.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
        </select>
        <select aria-label="Módulo" value={modulo} onChange={(e) => setModulo(e.target.value)} style={{ ...campo, maxWidth: 220 }}>
          <option value="">Todos los módulos</option>
          {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input aria-label="Buscar" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar" style={{ ...campo, flex: 1, minWidth: 120 }} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>{visibles.length} hallazgos</div>
      {visibles.length === 0 ? (
        <div style={{ ...tarjeta, color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>No hay hallazgos con estos filtros.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
          {visibles.map((h) => <Hallazgo key={h.id} h={h} puedeCerrar={puedeCerrar} userId={userId} onCambio={onCambio} />)}
        </div>
      )}
    </div>
  );
}
