import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEVERIDADES } from "../../data/severidades.js";
import { rutaFormulario } from "../../data/modulos.js";
import { cambiarEstadoHallazgo } from "../../lib/panel.js";
import { formatearFecha } from "../../lib/fechas.js";
import { normalizar } from "../../lib/texto.js";
import { Chip, tarjeta, textoTarjeta } from "./ui.jsx";
import { useConfirmacion } from "../../components/Confirmacion.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { Field, Input } from "../../components/ui/Field.jsx";
import { MultiSelect } from "../../components/ui/Select.jsx";
import { toast } from "../../components/ui/Toast.jsx";
import { nombreModulo } from "./Resumen.jsx";

// "Cerrado el 26/10/2026 por Ana Pérez · nota" (también el último cierre de uno reabierto).
const textoCierre = (h) =>
  `${formatearFecha(h.cerradoAt)}${h.cerradoPor ? ` por ${h.cerradoPor}` : ""}${h.notaCierre ? ` · ${h.notaCierre}` : ""}`;

function Hallazgo({ h, puedeCerrar, userId, userNombre, onCambio }) {
  const navigate = useNavigate();
  const [cerrando, setCerrando] = useState(false);
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, dialogo] = useConfirmacion();
  const sev = SEVERIDADES.find((s) => s.value === h.severidad) || SEVERIDADES[1];

  const cambiar = async (estado) => {
    setOcupado(true);
    try {
      await cambiarEstadoHallazgo(h, estado, userId, nota);
      setCerrando(false);
      setNota("");
      onCambio(h.id, estado, estado === "cerrado" ? { cerradoAt: new Date().toISOString(), notaCierre: nota.trim(), cerradoPor: userNombre } : {});
      toast.success(estado === "cerrado" ? "Hallazgo cerrado" : "Hallazgo reabierto", { descripcion: h.titulo });
    } catch (e) {
      toast.error("No se pudo guardar el cambio", { descripcion: e.message });
    } finally {
      setOcupado(false);
    }
  };

  const reabrir = async () => {
    const ok = await confirmar({
      titulo: "¿Reabrir el hallazgo?",
      mensaje: "Vuelve a quedar abierto. El último cierre (fecha, quién y nota) se conserva hasta que se cierre de nuevo.",
      aceptar: "Reabrir",
      peligro: false,
    });
    if (ok) cambiar("abierto");
  };

  return (
    <article className="en-card" style={{ ...tarjeta, opacity: h.estado === "cerrado" ? 0.85 : 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", gap: "var(--space-1-5)", flexWrap: "wrap", alignItems: "center" }}>
        <Chip bg={sev.bg} fg={sev.fg}>
          {h.severidad}
        </Chip>
        {h.estado === "cerrado" ? <span className="chip chip--success">Cerrado</span> : <span className="chip chip--warning">Abierto</span>}
        {h.vencido ? <span className="chip chip--danger">Vencido</span> : null}
      </div>
      <h3 className="t-headline" style={{ fontSize: "var(--text-callout)", overflowWrap: "anywhere" }}>
        {h.titulo}
      </h3>
      {h.detalle ? (
        <p className="t-footnote" style={{ ...textoTarjeta, overflowWrap: "anywhere" }}>
          {h.detalle}
        </p>
      ) : null}
      <div className="t-caption" style={{ ...textoTarjeta, display: "grid", gap: "var(--space-0-5)" }}>
        <span>
          {nombreModulo(h.moduloId, h.subId)} · {h.cliente || "Sin cliente"}
          {h.ubicacion ? ` · ${h.ubicacion}` : ""}
        </span>
        <span>
          Inspector: {h.inspector || "—"} · Responsable: {h.responsable || "Sin asignar"} · Vence: {formatearFecha(h.vence)}
        </span>
        {h.estado === "cerrado" ? <span>Cerrado el {textoCierre(h)}</span> : null}
        {h.estado === "abierto" && h.cerradoAt ? <span>Reabierto · último cierre el {textoCierre(h)}</span> : null}
      </div>

      {cerrando ? (
        <div style={{ marginTop: "var(--space-1)", display: "grid", gap: "var(--space-2)" }}>
          <Field label="Nota de cierre (opcional)" id={`nota-${h.id}`}>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué se hizo para resolverlo" maxLength={1000} />
          </Field>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Button variant="solid" size="sm" loading={ocupado} onClick={() => cambiar("cerrado")}>
              {ocupado ? "Guardando…" : "Confirmar cierre"}
            </Button>
            <Button size="sm" disabled={ocupado} onClick={() => setCerrando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)", flexWrap: "wrap" }}>
          {puedeCerrar && h.estado === "abierto" ? (
            <Button variant="solid" size="sm" icon="check" onClick={() => setCerrando(true)}>
              Cerrar hallazgo
            </Button>
          ) : null}
          {puedeCerrar && h.estado === "cerrado" ? (
            <Button size="sm" loading={ocupado} onClick={reabrir}>
              Reabrir
            </Button>
          ) : null}
          <Button size="sm" onClick={() => navigate(rutaFormulario(h.moduloId, h.subId, h.inspeccionId), { state: { volverA: "/panel" } })}>
            Ver inspección
          </Button>
        </div>
      )}
      {dialogo}
    </article>
  );
}

const ESTADOS_FILTRO = [
  ["abierto", "Abiertos"],
  ["cerrado", "Cerrados"],
  ["todos", "Todos"],
];

export default function Hallazgos({ hallazgos, puedeCerrar, userId, userNombre, onCambio }) {
  const [estado, setEstado] = useState("abierto");
  // Varias a la vez (ej. Crítico + Medio); vacío = todas.
  const [severidades, setSeveridades] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [texto, setTexto] = useState("");

  const nombresModulo = useMemo(() => [...new Set(hallazgos.map((h) => nombreModulo(h.moduloId, h.subId)))].sort(), [hallazgos]);
  const opcionesSeveridad = useMemo(() => SEVERIDADES.map((s) => ({ value: s.value, label: s.value })), []);
  const opcionesModulo = useMemo(() => nombresModulo.map((m) => ({ value: m, label: m })), [nombresModulo]);

  const visibles = useMemo(() => {
    const q = normalizar(texto);
    return hallazgos.filter(
      (h) =>
        (estado === "todos" || h.estado === estado) &&
        (!severidades.length || severidades.includes(h.severidad)) &&
        (!modulos.length || modulos.includes(nombreModulo(h.moduloId, h.subId))) &&
        (!q || [h.titulo, h.detalle, h.cliente, h.responsable, h.inspector].some((v) => normalizar(v).includes(q)))
    );
  }, [hallazgos, estado, severidades, modulos, texto]);

  const hayFiltros = estado !== "abierto" || severidades.length || modulos.length || texto.trim();

  return (
    <div>
      <div className="sobre-fondo fila-pills" role="group" aria-label="Estado" style={{ marginBottom: "var(--space-3)" }}>
        {ESTADOS_FILTRO.map(([v, l]) => (
          <button key={v} type="button" className="pill" aria-pressed={estado === v} onClick={() => setEstado(v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="panel panel--compacto" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <MultiSelect
          aria-label="Severidad"
          titulo="Severidad"
          size="sm"
          placeholder="Toda severidad"
          options={opcionesSeveridad}
          value={severidades}
          onChange={setSeveridades}
          style={{ flex: "1 1 180px", width: "auto" }}
        />
        {/* Con más de 8 módulos (cada regla de oro cuenta aparte) tiene buscador. */}
        <MultiSelect
          aria-label="Módulo"
          titulo="Módulo"
          size="sm"
          placeholder="Todos los módulos"
          placeholderBusqueda="Buscar módulo"
          options={opcionesModulo}
          value={modulos}
          onChange={setModulos}
          style={{ flex: "1 1 220px", width: "auto" }}
        />
        <Input
          type="search"
          inputMode="search"
          aria-label="Buscar"
          size="sm"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar"
          style={{ flex: "2 1 160px", width: "auto" }}
        />
      </div>
      <div className="t-footnote" role="status" style={{ color: "var(--text-on-app-muted)", marginBottom: "var(--space-2)", fontWeight: "var(--weight-semibold)" }}>
        {visibles.length} {visibles.length === 1 ? "hallazgo" : "hallazgos"}
      </div>
      {visibles.length === 0 ? (
        <EmptyState
          sobreFondo
          icono={hayFiltros ? "search" : "checkCircle"}
          titulo={hayFiltros ? "No hay hallazgos con estos filtros" : "No hay hallazgos abiertos"}
          texto={hayFiltros ? "Probá con otro estado, severidad o módulo." : "Los hallazgos de las inspecciones enviadas aparecen acá."}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))", gap: "var(--space-3)" }}>
          {visibles.map((h) => (
            <Hallazgo key={h.id} h={h} puedeCerrar={puedeCerrar} userId={userId} userNombre={userNombre} onCambio={onCambio} />
          ))}
        </div>
      )}
    </div>
  );
}
