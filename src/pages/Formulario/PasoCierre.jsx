import { useMemo, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { OPCIONES, agruparPorCategoria } from "../../data/checklist.js";
import FirmaPad from "../../components/FirmaPad.jsx";
import GaleriaFotos from "../../components/GaleriaFotos.jsx";
import { useColaboradores } from "../../lib/colaboradores.js";

const panelStyle = {
  borderRadius: 18,
  background: "var(--violet-75)",
  border: "1px solid var(--border)",
  padding: 14,
  marginTop: 14,
};

const panelTituloStyle = {
  fontSize: 11,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
  marginBottom: 11,
};

const ROLES_FIRMA = [
  { rol: "inspector", titulo: "Inspector CMASS" },
  { rol: "responsable", titulo: "Responsable del área" },
];

export default function PasoCierre({
  resumen,
  titulo,
  generales,
  checklist,
  respuestas,
  hallazgos,
  fotos = [],
  subiendoFotos = 0,
  onAgregarFotos,
  onQuitarFoto,
  maxFotos,
  firmas = {},
  nombreInspector,
  nombreResponsable,
  onNombreResponsable,
  onNombreResponsableBlur,
  onGuardarFirma,
  guardandoFirma = {},
}) {
  const colaboradores = useColaboradores();
  const bloques = useMemo(() => agruparPorCategoria(checklist), [checklist]);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const descargarPDF = async () => {
    setGenerandoPDF(true);
    try {
      const { generarInformePDF } = await import("../../lib/informePdf.js");
      const { urlADataUrl } = await import("../../lib/fotos.js");
      const fotosPdf = (await Promise.all(fotos.map((f) => (f.url ? urlADataUrl(f.url).catch(() => null) : null)))).filter(Boolean);
      const firmasPdf = {};
      await Promise.all(
        Object.entries(firmas).map(async ([rol, f]) => {
          if (f?.url) firmasPdf[rol] = { nombre: f.nombre, dataUrl: await urlADataUrl(f.url).catch(() => null) };
        })
      );
      generarInformePDF({ titulo, generales, resumen, checklist, respuestas, hallazgos, fotos: fotosPdf, firmas: firmasPdf });
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <div>
      <GaleriaFotos fotos={fotos} subiendo={subiendoFotos} max={maxFotos} onAgregar={onAgregarFotos} onQuitar={onQuitarFoto} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 14 }}>
        {ROLES_FIRMA.map(({ rol, titulo: tituloRol }) => (
          <div key={rol} style={{ borderRadius: 18, border: "1px solid var(--border)", background: "var(--violet-tint-2)", padding: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 9 }}>
              {tituloRol}
            </div>
            <FirmaPad firma={firmas[rol]} guardando={Boolean(guardandoFirma[rol])} onGuardar={(blob) => onGuardarFirma(rol, blob)} />
            {rol === "inspector" ? (
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9 }}>{nombreInspector}</div>
            ) : (
              <input
                list="lista-colaboradores-cierre"
                placeholder="Nombre y apellido del responsable"
                value={nombreResponsable}
                onChange={(e) => onNombreResponsable(e.target.value)}
                onBlur={onNombreResponsableBlur}
                style={{ width: "100%", marginTop: 9, border: "1px solid var(--border)", borderRadius: 12, padding: 10, fontSize: 13.5, background: "#fff", color: "var(--ink)", minHeight: 42 }}
              />
            )}
            {rol === "responsable" && (
              <datalist id="lista-colaboradores-cierre">
                {colaboradores.map((c, i) => (
                  <option key={`${c.correo}-${i}`} value={c.etiqueta} label={c.correo || undefined} />
                ))}
              </datalist>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 18, background: "var(--violet-75)", border: "1px solid var(--border)", padding: 14 }}>
        <div style={panelTituloStyle}>Resumen</div>
        {resumen.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, padding: "5px 0" }}>
            <span style={{ color: "var(--muted-3)" }}>{r.label}</span>
            <strong className="heading" style={{ color: r.color }}>
              {r.value}
            </strong>
          </div>
        ))}
      </div>

      <div style={panelStyle}>
        <div style={panelTituloStyle}>Resumen del checklist</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {bloques.map((b) => (
            <div key={b.categoria}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--violet-800)", marginBottom: 7 }}>{b.categoria}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {b.items.map((item) => {
                  const opcion = OPCIONES.find((o) => o.value === respuestas[item.codigo]);
                  return (
                    <div key={item.codigo} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                      <span style={{ flex: "0 0 auto", fontWeight: 700, color: "var(--violet-700)", minWidth: 26 }}>{item.codigo}</span>
                      <span style={{ flex: 1, color: "var(--ink)", lineHeight: 1.4 }}>{item.texto}</span>
                      <span
                        style={{
                          flex: "0 0 auto",
                          fontWeight: 700,
                          fontSize: 11,
                          padding: "3px 9px",
                          borderRadius: 20,
                          whiteSpace: "nowrap",
                          background: opcion ? opcion.bg : "var(--neutral-bg)",
                          color: opcion ? opcion.fg : "var(--muted)",
                        }}
                      >
                        {opcion ? opcion.label : "Sin responder"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hallazgos.length > 0 ? (
        <div style={panelStyle}>
          <div style={panelTituloStyle}>Hallazgos ({hallazgos.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hallazgos.map((h, i) => (
              <div key={`${h.titulo}-${i}`} style={{ borderRadius: 14, background: "#fff8fb", border: "1px solid #f7dce7", padding: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong className="heading" style={{ fontSize: 13 }}>
                    {h.titulo}
                  </strong>
                  <span style={{ background: h.sevBg, color: h.sevFg, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>
                    {h.severidad}
                  </span>
                </div>
                {h.detalle ? <div style={{ fontSize: 12, color: "var(--muted-4)", lineHeight: 1.45, marginBottom: 6 }}>{h.detalle}</div> : null}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                  <span>
                    Responsable: <strong style={{ color: "var(--ink)" }}>{h.responsable}</strong>
                  </span>
                  <span>
                    Vence: <strong style={{ color: "var(--ink)" }}>{h.vence}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {ROLES_FIRMA.some(({ rol }) => !firmas[rol]) ? (
        <div style={{ marginTop: 14, background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: 14, padding: 11, fontSize: 12.5, fontWeight: 600 }}>
          Falta guardar la firma de {ROLES_FIRMA.filter(({ rol }) => !firmas[rol]).map(({ titulo: t }) => t).join(" y ")}: el informe saldrá sin ella.
        </div>
      ) : null}

      <button
        onClick={descargarPDF}
        disabled={generandoPDF}
        style={{
          marginTop: 14,
          width: "100%",
          border: "1.5px solid var(--violet-300)",
          background: "#fff",
          color: "var(--violet-800)",
          fontWeight: 700,
          fontSize: 13.5,
          padding: 14,
          borderRadius: 16,
          cursor: generandoPDF ? "wait" : "pointer",
          opacity: generandoPDF ? 0.7 : 1,
          minHeight: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="download" size={17} strokeWidth={2} />
        {generandoPDF ? "Generando PDF…" : "Descargar informe (PDF)"}
      </button>
    </div>
  );
}
