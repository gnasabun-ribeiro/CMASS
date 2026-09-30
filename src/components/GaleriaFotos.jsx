import Icon from "./Icon.jsx";

// Fotos generales de la inspección: se sacan o eligen varias a la vez y se muestran como miniaturas.
export default function GaleriaFotos({ fotos, subiendo = 0, max = 20, onAgregar, onQuitar }) {
  const lleno = fotos.length >= max;
  const ocupado = subiendo > 0;
  const habilitado = !lleno && !ocupado;

  return (
    <div style={{ borderRadius: 18, border: "1px solid var(--border)", background: "var(--violet-tint-2)", padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: fotos.length || ocupado ? 12 : 0 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
            Fotos de la inspección
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 2 }}>
            {fotos.length} de {max}
            {lleno ? " · límite alcanzado" : ""}
          </div>
        </div>
        <label
          style={{
            border: "1.5px dashed var(--violet-300)",
            background: "#fff",
            color: "var(--violet-800)",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "10px 14px",
            borderRadius: 14,
            cursor: habilitado ? "pointer" : "not-allowed",
            opacity: habilitado ? 1 : 0.5,
            minHeight: 46,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="camera" size={16} strokeWidth={1.8} />
          {ocupado ? "Procesando…" : "Agregar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={!habilitado}
            onChange={(e) => {
              const archivos = [...(e.target.files || [])];
              e.target.value = "";
              if (archivos.length) onAgregar(archivos);
            }}
          />
        </label>
      </div>

      {fotos.length || ocupado ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 10 }}>
          {fotos.map((f, i) => (
            <div key={f.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "var(--neutral-bg)" }}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)", textAlign: "center", padding: 6 }}>
                  Sin vista previa (sin conexión)
                </div>
              )}
              <button
                onClick={() => onQuitar(f)}
                aria-label={`Quitar foto ${i + 1}`}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: 0,
                  background: "rgba(0,0,0,.65)",
                  color: "#fff",
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
          {Array.from({ length: subiendo }).map((_, i) => (
            <div key={`p${i}`} style={{ aspectRatio: "1", borderRadius: 12, border: "1px dashed var(--violet-300)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>
              Procesando…
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
