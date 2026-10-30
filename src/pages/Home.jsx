import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import ModuleCard, { GRILLA_CELULAR } from "../components/ModuleCard.jsx";
import { enGrupoInspecciones, GRUPO_INSPECCIONES, MODULOS } from "../data/modulos.js";
import { ICONOS_ANIMADOS } from "../data/iconosAnimados.js";
import { FiltrosIconos } from "../components/IconoAnimado.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { TEMAS, useTheme } from "../context/ThemeContext.jsx";
import { useCelular } from "../lib/useCelular.js";

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
  // min(): en un celular de 360 px quedan 332 px de ancho y una columna fija de 340 se salía de la pantalla.
  return "repeat(auto-fill,minmax(min(340px,100%),1fr))";
}

export default function Home() {
  const navigate = useNavigate();
  const { nombre, email, puede } = useAuth();
  const { tema, setTema } = useTheme();
  const celular = useCelular();
  const [columnas, setColumnas] = useState(
    () => localStorage.getItem(COLUMNAS_KEY) || "auto"
  );

  useEffect(() => {
    localStorage.setItem(COLUMNAS_KEY, columnas);
  }, [columnas]);

  // Los módulos agrupados se reemplazan por una sola card "Inspecciones" (en el lugar del primero).
  const itemsHome = [];
  for (const m of MODULOS) {
    if (m.permiso && !puede(m.permiso)) continue;
    if (!enGrupoInspecciones(m.id)) itemsHome.push(m);
    else if (!itemsHome.includes(GRUPO_INSPECCIONES)) itemsHome.push(GRUPO_INSPECCIONES);
  }

  const openModulo = (m) => {
    if (m.nav) navigate(m.nav);
    else if (m.form) navigate(`/form/${m.id}`);
    else navigate(`/modulos/${m.id}`);
  };

  return (
    // En el celular el nombre ya ocupa dos líneas: el subtítulo queda solo con el correo.
    <AppShell title={`¡Hola, ${nombre}!`} subtitle={celular ? email : `Inspecciones CMASS · ${email}`}>
      <FiltrosIconos />
      {/* Selector segmentado sobre fondo de card: "Tema" en gris sobre el degradé violeta no se leía,
          y la opción activa (violeta) se perdía contra el fondo. */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <div
          role="group"
          aria-label="Tema"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            padding: 4,
            borderRadius: 22,
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--card-desc)", padding: "0 8px 0 10px" }}>Tema</span>
          {TEMAS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTema(t.value)}
              aria-pressed={tema === t.value}
              style={{
                border: 0,
                background: tema === t.value ? "var(--active-bg)" : "transparent",
                color: tema === t.value ? "var(--on-active)" : "var(--card-accent)",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "7px 14px",
                borderRadius: 18,
                cursor: "pointer",
                minHeight: 34,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="columnas-selector"
        style={{ alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}
      >
        <label htmlFor="columnas" style={{ fontSize: 13, fontWeight: 600, color: "var(--violet-150)" }}>
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
      {/* En el celular el selector de columnas no se ve: siempre una card por fila, todas de la misma altura. */}
      <div style={celular ? GRILLA_CELULAR : { display: "grid", gridTemplateColumns: gridColumnas(columnas), gap: 18 }}>
        {itemsHome.map((m, i) => (
          <ModuleCard
            key={m.id}
            modulo={m}
            index={i}
            onOpen={() => openModulo(m)}
            onRegistros={() => navigate(`/registros/${m.id}`)}
            iconoAnimado={ICONOS_ANIMADOS[m.id]}
          />
        ))}
      </div>
    </AppShell>
  );
}
