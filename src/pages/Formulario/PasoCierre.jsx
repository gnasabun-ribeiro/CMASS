import { useMemo, useState } from "react";
import { OPCIONES, agruparPorCategoria } from "../../data/checklist.js";
import FirmaPad from "../../components/FirmaPad.jsx";
import GaleriaFotos from "../../components/GaleriaFotos.jsx";
import Banner from "../../components/ui/Banner.jsx";
import Button from "../../components/ui/Button.jsx";
import { toast } from "../../components/ui/Toast.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const ROLES_FIRMA = [
  { rol: "inspector", titulo: "Inspector CMASS" },
];

function Seccion({ titulo, children }) {
  return (
    <section className="panel--inset" style={{ marginTop: "var(--space-4)" }}>
      <h3 className="panel__titulo">{titulo}</h3>
      {children}
    </section>
  );
}

export default function PasoCierre({
  resumen,
  titulo,
  generales,
  checklist,
  respuestas,
  comentarios = {},
  hallazgos,
  fotos = [],
  subiendoFotos = 0,
  onAgregarFotos,
  onQuitarFoto,
  maxFotos,
  errorFotos = null,
  firmas = {},
  borradoresFirma = {},
  onBorradorFirma,
  nombreInspector,
  onGuardarFirma,
  guardandoFirma = {},
  soloLectura = false,
  formato, // "top": el PDF sale con el formato de la tarjeta impresa
  // La TOP no lleva fotos, hallazgos ni resumen del checklist (la tarjeta de papel no los tiene).
  conFotos = true,
  conHallazgos = true,
  conChecklist = true,
  secciones = [], // [{ titulo, filas: [[etiqueta, valor]] } | { titulo, texto }]: datos propios del módulo
}) {
  const bloques = useMemo(() => agruparPorCategoria(checklist), [checklist]);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const { puede } = useAuth();

  const generar = async () => {
    const { generarInformePDF } = await import("../../lib/informePdf.js");
    const { urlADataUrl } = await import("../../lib/fotos.js");
    const fotosPdf = (await Promise.all(fotos.map((f) => (f.url ? urlADataUrl(f.url).catch(() => null) : null)))).filter(Boolean);
    const firmasPdf = {};
    await Promise.all(
      Object.entries(firmas).map(async ([rol, f]) => {
        if (f?.url) firmasPdf[rol] = { nombre: f.nombre, dataUrl: await urlADataUrl(f.url).catch(() => null) };
      })
    );
    await generarInformePDF({ formato, titulo, generales, resumen, checklist, respuestas, comentarios, hallazgos, fotos: fotosPdf, firmas: firmasPdf });
  };

  // Antes, si fallaba (ej. sin conexión para bajar el módulo del PDF), no pasaba nada.
  const descargarPDF = () => {
    setGenerandoPDF(true);
    toast
      .promise(generar(), {
        loading: "Generando el PDF…",
        success: "PDF descargado",
        error: (e) => ({ titulo: "No se pudo generar el PDF", descripcion: navigator.onLine ? e?.message : "Revisá la conexión y probá de nuevo." }),
      })
      .catch(() => {})
      .finally(() => setGenerandoPDF(false));
  };

  const faltanFirmas = ROLES_FIRMA.filter(({ rol }) => !firmas[rol]);

  return (
    <div>
      {/* El PDF queda fuera: se puede descargar aunque la inspección sea de solo lectura. */}
      <fieldset disabled={soloLectura} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {conFotos ? (
          <GaleriaFotos fotos={fotos} subiendo={subiendoFotos} max={maxFotos} aviso={errorFotos} onAgregar={onAgregarFotos} onQuitar={onQuitarFoto} />
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {ROLES_FIRMA.map(({ rol, titulo: tituloRol }) => (
            <section key={rol} className="panel--inset" aria-label={`Firma: ${tituloRol}`}>
              <h3 className="panel__titulo">{tituloRol}</h3>
              <FirmaPad
                firma={firmas[rol]}
                guardando={Boolean(guardandoFirma[rol])}
                onGuardar={(blob) => onGuardarFirma(rol, blob)}
                borrador={borradoresFirma[rol]}
                onBorrador={(dataUrl) => onBorradorFirma?.(rol, dataUrl)}
              />
              {/* Quien firmó, no quien está mirando; si todavía no hay firma, quien va a firmar. */}
              <div className="t-callout" style={{ fontWeight: "var(--weight-semibold)", marginTop: "var(--space-2)" }}>
                {firmas[rol]?.nombre || nombreInspector}
              </div>
            </section>
          ))}
        </div>
      </fieldset>

      <section className="panel--inset">
        <h3 className="panel__titulo">Resumen</h3>
        {resumen.map((r) => (
          <div key={r.label} className="fila-dato">
            <span>{r.label}</span>
            <strong className="heading tabular" style={{ color: r.color }}>
              {r.value}
            </strong>
          </div>
        ))}
      </section>

      {secciones.map((sec) => (
        <Seccion key={sec.titulo} titulo={sec.titulo}>
          {sec.filas ? (
            sec.filas.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="fila-dato">
                <span>{etiqueta}</span>
                <strong>{valor?.trim() || "—"}</strong>
              </div>
            ))
          ) : (
            <p className="t-callout" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: sec.texto?.trim() ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {sec.texto?.trim() || "Sin completar."}
            </p>
          )}
        </Seccion>
      ))}

      {!conHallazgos ? null : hallazgos.length === 0 ? (
        <Seccion titulo="Hallazgos (0)">
          <p className="t-footnote" style={{ color: "var(--text-tertiary)" }}>
            No se cargaron hallazgos en el paso 3. El informe saldrá sin esa sección.
          </p>
        </Seccion>
      ) : (
        <Seccion titulo={`Hallazgos (${hallazgos.length})`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {hallazgos.map((h, i) => (
              <li
                key={`${h.titulo}-${i}`}
                style={{ borderRadius: "var(--radius-md)", background: "var(--hallazgo-bg)", border: "var(--hairline) solid var(--hallazgo-border)", padding: "var(--space-3)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--space-1-5)" }}>
                  <strong className="t-footnote" style={{ fontWeight: "var(--weight-bold)", overflowWrap: "anywhere" }}>
                    {h.titulo}
                  </strong>
                  <span className="chip" style={{ background: h.sevBg, color: h.sevFg }}>
                    {h.severidad}
                  </span>
                </div>
                {h.detalle ? (
                  <p className="t-caption" style={{ color: "var(--text-secondary)", marginBottom: "var(--space-1-5)", overflowWrap: "anywhere" }}>
                    {h.detalle}
                  </p>
                ) : null}
                <div className="t-caption" style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", color: "var(--text-tertiary)" }}>
                  <span>
                    Responsable: <strong style={{ color: "var(--text-primary)" }}>{h.responsable}</strong>
                  </span>
                  <span>
                    Vence: <strong style={{ color: "var(--text-primary)" }}>{h.vence}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {conChecklist ? (
        <Seccion titulo="Resumen del checklist">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {bloques.map((b) => (
              <div key={b.categoria}>
                <h4 className="t-footnote" style={{ fontWeight: "var(--weight-bold)", color: "var(--accent-text)", marginBottom: "var(--space-2)" }}>
                  {b.categoria}
                </h4>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {b.items.map((item) => {
                    const opcion = OPCIONES.find((o) => o.value === respuestas[item.codigo]);
                    return (
                      <li key={item.codigo} className="t-footnote" style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
                        <span className="tabular" style={{ flex: "0 0 auto", fontWeight: "var(--weight-bold)", color: "var(--accent-text)", minWidth: 28 }}>
                          {item.codigo}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, color: "var(--text-primary)" }}>
                          {item.texto}
                          {respuestas[item.codigo] === "parcial" ? (
                            <span style={{ display: "block", marginTop: "var(--space-1)", color: comentarios[item.codigo]?.trim() ? "var(--warn-fg)" : "var(--danger-fg)", fontWeight: "var(--weight-semibold)" }}>
                              Detalle: {comentarios[item.codigo]?.trim() || "falta completarlo"}
                            </span>
                          ) : null}
                        </span>
                        <span className="chip" style={{ background: opcion ? opcion.bg : "var(--neutral-bg)", color: opcion ? opcion.fg : "var(--text-tertiary)" }}>
                          {opcion ? opcion.label : "Sin responder"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Seccion>
      ) : null}

      {faltanFirmas.length ? (
        <Banner tono="warning" style={{ marginTop: "var(--space-4)" }}>
          Falta guardar la firma de {faltanFirmas.map(({ titulo: t }) => t).join(" y ")}: el informe saldrá sin ella.
        </Banner>
      ) : null}

      {puede("descargarPdf") ? (
        <Button variant="outline" size="lg" block icon="download" loading={generandoPDF} onClick={descargarPDF} style={{ marginTop: "var(--space-4)" }}>
          {generandoPDF ? "Generando PDF…" : "Descargar informe (PDF)"}
        </Button>
      ) : null}
    </div>
  );
}
