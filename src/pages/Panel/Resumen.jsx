import { useMemo } from "react";
import { findModulo, findSub } from "../../data/modulos.js";
import { Barra, Cifra, Titulo, tarjeta } from "./ui.jsx";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const nombreModulo = (moduloId, subId) =>
  findSub(moduloId, subId)?.title || findModulo(moduloId)?.title || moduloId;

function contar(lista, clave) {
  const m = new Map();
  for (const x of lista) m.set(clave(x), (m.get(clave(x)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Fila({ nombre, valor, maximo, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: "0 1 46%", minWidth: 0, fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{nombre}</div>
      <Barra parte={valor} maximo={maximo} />
      <div style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{extra ?? valor}</div>
    </div>
  );
}

export default function Resumen({ hallazgos, inspecciones }) {
  const datos = useMemo(() => {
    const abiertos = hallazgos.filter((h) => h.estado === "abierto");
    const porModulo = new Map();
    for (const h of hallazgos) {
      const k = nombreModulo(h.moduloId, h.subId);
      const v = porModulo.get(k) || { abiertos: 0, cerrados: 0 };
      v[h.estado === "abierto" ? "abiertos" : "cerrados"]++;
      porModulo.set(k, v);
    }
    const hoy = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({ clave: `${d.getFullYear()}-${d.getMonth()}`, nombre: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, n: 0 });
    }
    for (const i of inspecciones) {
      const d = new Date(i.creado);
      const m = meses.find((x) => x.clave === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.n++;
    }
    return {
      abiertos: abiertos.length,
      cerrados: hallazgos.length - abiertos.length,
      criticos: abiertos.filter((h) => h.severidad === "Crítico").length,
      vencidos: abiertos.filter((h) => h.vencido).length,
      porModulo: [...porModulo.entries()].sort((a, b) => b[1].abiertos + b[1].cerrados - (a[1].abiertos + a[1].cerrados)),
      porInspector: contar(inspecciones, (i) => i.inspector),
      meses,
    };
  }, [hallazgos, inspecciones]);

  const maxModulo = Math.max(1, ...datos.porModulo.map(([, v]) => v.abiertos + v.cerrados));
  const maxInspector = Math.max(1, ...datos.porInspector.map(([, n]) => n));
  const maxMes = Math.max(1, ...datos.meses.map((m) => m.n));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Cifra valor={datos.abiertos} etiqueta="Hallazgos abiertos" tono={datos.abiertos ? "warn" : undefined} />
        <Cifra valor={datos.cerrados} etiqueta="Hallazgos cerrados" tono="success" />
        <Cifra valor={datos.criticos} etiqueta="Críticos abiertos" tono={datos.criticos ? "danger" : undefined} />
        <Cifra valor={datos.vencidos} etiqueta="Abiertos vencidos" tono={datos.vencidos ? "danger" : undefined} />
      </div>

      <Titulo>Hallazgos por módulo (abiertos / cerrados)</Titulo>
      <div style={tarjeta}>
        {datos.porModulo.length === 0 ? <Vacio /> : datos.porModulo.map(([nombre, v]) => (
          <Fila key={nombre} nombre={nombre} valor={v.abiertos + v.cerrados} maximo={maxModulo} extra={`${v.abiertos} / ${v.cerrados}`} />
        ))}
      </div>

      <Titulo>Inspecciones enviadas por inspector</Titulo>
      <div style={tarjeta}>
        {datos.porInspector.length === 0 ? <Vacio /> : datos.porInspector.map(([nombre, n]) => <Fila key={nombre} nombre={nombre} valor={n} maximo={maxInspector} />)}
      </div>

      <Titulo>Inspecciones enviadas por mes</Titulo>
      <div style={tarjeta}>
        {datos.meses.map((m) => <Fila key={m.clave} nombre={m.nombre} valor={m.n} maximo={maxMes} />)}
      </div>
    </div>
  );
}

const Vacio = () => <div style={{ fontSize: 13, color: "var(--card-desc, var(--muted))" }}>Todavía no hay datos.</div>;
