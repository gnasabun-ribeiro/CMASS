import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { GRUPOS_PENDIENTES, PENDIENTES_TOTAL } from "../data/mockRegistros.js";

export default function Pendientes() {
  const navigate = useNavigate();

  return (
    <AppShell title="Pendientes" subtitle="Se envían solos al recuperar señal" onBack={() => navigate("/")}>
      <div
        style={{
          borderRadius: 24,
          padding: 17,
          background: "var(--brand-gradient)",
          color: "var(--violet-150)",
          display: "flex",
          gap: 13,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 15,
          boxShadow: "0 20px 40px -24px rgba(36,18,70,.8)",
        }}
      >
        <div style={{ flex: 1, minWidth: 190 }}>
          <div className="heading" style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-.3px" }}>
            {PENDIENTES_TOTAL} registros sin sincronizar
          </div>
          <div style={{ fontSize: 12.5, color: "var(--violet-150)", marginTop: 3 }}>Última sincronización: hoy 08:41 · 34 enviados</div>
        </div>
        <button
          style={{
            border: 0,
            background: "var(--violet-400)",
            color: "var(--ink)",
            fontWeight: 800,
            fontSize: 13.5,
            padding: "14px 20px",
            borderRadius: 16,
            cursor: "pointer",
            minHeight: 50,
          }}
        >
          Sincronizar ahora
        </button>
      </div>

      {GRUPOS_PENDIENTES.map((g) => (
        <div key={g.titulo} style={{ marginBottom: 18 }}>
          <h3
            className="heading"
            style={{ margin: "0 0 9px", fontSize: 12.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--violet-150)" }}
          >
            {g.titulo}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
            {g.items.map((i) => (
              <div
                key={i.label}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "13px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 10px 22px -20px rgba(36,18,70,.5)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{i.meta}</div>
                </div>
                <span
                  className="heading"
                  style={{
                    width: 36,
                    height: 36,
                    flex: "0 0 36px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    background: i.pending ? "var(--warn-bg)" : "var(--neutral-bg)",
                    color: i.pending ? "var(--warn-fg)" : "var(--neutral-fg)",
                  }}
                >
                  {i.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
