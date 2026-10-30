import Icon from "./Icon.jsx";
import Banner from "./ui/Banner.jsx";

// Fotos generales de la inspección: se sacan o eligen varias a la vez y se muestran como miniaturas.
// `aviso`: archivos que no se pudieron leer como imagen (no es un error de guardado: va acá, junto a las fotos).
export default function GaleriaFotos({ fotos, subiendo = 0, max = 20, aviso = null, onAgregar, onQuitar }) {
  const lleno = fotos.length >= max;
  const ocupado = subiendo > 0;
  const habilitado = !lleno && !ocupado;

  // Quitar no pregunta: el aviso que aparece tiene "Deshacer" (ver borrarConDeshacer en Formulario).
  const quitar = (f) => onQuitar(f);

  return (
    <section className="panel--inset" aria-label="Fotos de la inspección" style={{ marginBottom: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: fotos.length || ocupado || aviso ? "var(--space-3)" : 0 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <h3 className="panel__titulo" style={{ marginBottom: 0 }}>
            Fotos de la inspección
          </h3>
          <div className="t-caption tabular" style={{ color: "var(--text-tertiary)", marginTop: "var(--space-0-5)" }} aria-live="polite">
            {fotos.length} de {max}
            {lleno ? " · límite alcanzado" : ""}
          </div>
        </div>
        {/* El input va adentro del label: tocar el botón abre la cámara o la galería. */}
        <label
          className="btn btn--outline"
          aria-disabled={!habilitado || undefined}
          style={{ borderStyle: "dashed", cursor: habilitado ? "pointer" : "not-allowed", opacity: habilitado ? 1 : 0.5 }}
        >
          {ocupado ? <span className="spinner" aria-hidden="true" /> : <Icon name="camera" size={16} />}
          {ocupado ? "Procesando…" : "Agregar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={!habilitado}
            className="visually-hidden"
            onChange={(e) => {
              const archivos = [...(e.target.files || [])];
              e.target.value = "";
              if (archivos.length) onAgregar(archivos);
            }}
          />
        </label>
      </div>

      {aviso ? (
        <Banner tono="danger" alerta style={{ marginBottom: fotos.length || ocupado ? "var(--space-3)" : 0 }}>
          {aviso}
        </Banner>
      ) : null}

      {fotos.length || ocupado ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: "var(--space-2)" }}>
          {fotos.map((f, i) => (
            <li
              key={f.id}
              style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-md)", overflow: "hidden", border: "var(--hairline) solid var(--border)", background: "var(--neutral-bg)" }}
            >
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Ver foto ${i + 1}`} style={{ display: "block", height: "100%" }}>
                  <img src={f.url} alt={`Foto ${i + 1}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <div className="t-caption" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", textAlign: "center", padding: "var(--space-1-5)" }}>
                  Sin vista previa (sin conexión)
                </div>
              )}
              {/* Área táctil de 44 px; el círculo visible es más chico. */}
              <button
                type="button"
                onClick={() => quitar(f, i)}
                aria-label={`Quitar foto ${i + 1}`}
                className="sin-hover"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "var(--touch-min)",
                  height: "var(--touch-min)",
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    margin: "var(--space-1)",
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-full)",
                    background: "rgba(0,0,0,.65)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="x" size={16} />
                </span>
              </button>
            </li>
          ))}
          {Array.from({ length: subiendo }).map((_, i) => (
            <li
              key={`p${i}`}
              className="skeleton"
              aria-label="Procesando foto"
              style={{ aspectRatio: "1", borderRadius: "var(--radius-md)" }}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
