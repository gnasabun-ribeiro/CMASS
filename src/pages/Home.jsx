import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import ModuleCard from "../components/ModuleCard.jsx";
import { MODULOS } from "../data/modulos.js";
import { useAuth } from "../context/AuthContext.jsx";
import { TEMAS, useTheme } from "../context/ThemeContext.jsx";

const COLUMNAS_KEY = "cmass:home:columnas";

const OPCIONES_COLUMNAS = [
  { value: "auto", label: "Auto" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "4", label: "4" },
];

function gridColumnas(valor) {
  if (valor === "1") return "1fr";
  if (valor === "2") return "repeat(2,1fr)";
  if (valor === "4") return "repeat(4,1fr)";
  return "repeat(auto-fill,minmax(340px,1fr))";
}

export default function Home() {
  const navigate = useNavigate();
  const { nombre, email } = useAuth();
  const { tema, setTema } = useTheme();
  const [columnas, setColumnas] = useState(
    () => localStorage.getItem(COLUMNAS_KEY) || "auto"
  );

  useEffect(() => {
    localStorage.setItem(COLUMNAS_KEY, columnas);
  }, [columnas]);

  const openModulo = (m) => {
    if (m.nav) navigate(m.nav);
    else if (m.form) navigate(`/form/${m.id}`);
    else navigate(`/modulos/${m.id}`);
  };

  return (
    <AppShell title={`¡Bienvenido, ${nombre}!`} subtitle={`Inspecciones CMASS · ${email}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginRight: 2 }}>Tema</span>
        {TEMAS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTema(t.value)}
            style={{
              border: 0,
              background: tema === t.value ? "var(--active-bg)" : "var(--violet-50)",
              color: tema === t.value ? "var(--on-active)" : "var(--violet-800)",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 20,
              cursor: "pointer",
              minHeight: 38,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="columnas-selector"
        style={{ alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}
      >
        <label htmlFor="columnas" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
          Cards por fila
        </label>
        <select
          id="columnas"
          value={columnas}
          onChange={(e) => setColumnas(e.target.value)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {OPCIONES_COLUMNAS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridColumnas(columnas),
          gap: 18,
        }}
      >
        {MODULOS.map((m, i) => (
          <ModuleCard
            key={m.id}
            modulo={m}
            index={i}
            onOpen={() => openModulo(m)}
            onRegistros={() => navigate(`/registros/${m.id}`)}
          />
        ))}
      </div>
    </AppShell>
  );
}
