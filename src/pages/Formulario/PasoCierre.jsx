const FIRMAS = [
  { rol: "Inspector CMASS", nombre: "M. Giménez" },
  { rol: "Responsable del área", nombre: "J. Alcaraz" },
];

export default function PasoCierre({ resumen }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 14 }}>
        {FIRMAS.map((f) => (
          <div key={f.rol} style={{ borderRadius: 18, border: "1px solid var(--border)", background: "var(--violet-tint-2)", padding: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 9 }}>
              {f.rol}
            </div>
            <div
              style={{
                height: 100,
                border: "1.5px dashed var(--violet-300)",
                borderRadius: 14,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted-2)",
                fontSize: 12.5,
              }}
            >
              Firmar acá
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9 }}>{f.nombre}</div>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 18, background: "var(--violet-75)", border: "1px solid var(--border)", padding: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginBottom: 9 }}>
          Resumen
        </div>
        {resumen.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, padding: "5px 0" }}>
            <span style={{ color: "var(--muted-3)" }}>{r.label}</span>
            <strong className="heading" style={{ color: r.color }}>
              {r.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
