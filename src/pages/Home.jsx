import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import ModuleCard, { GRILLA_CELULAR } from "../components/ModuleCard.jsx";
import { Select } from "../components/ui/Select.jsx";
import { enGrupoInspecciones, GRUPO_INSPECCIONES, MODULOS } from "../data/modulos.js";
import { ICONOS_ANIMADOS } from "../data/iconosAnimados.js";
import { FiltrosIconos } from "../components/IconoAnimado.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { MODOS, TEMAS, useTheme } from "../context/ThemeContext.jsx";
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
  if (valor === "2") return "repeat(2,minmax(0,1fr))";
  if (valor === "4") return "repeat(4,minmax(0,1fr))";
  // min(): en un celular de 360 px quedan 328 px de ancho y una columna fija de 340 se salía de la pantalla.
  return "repeat(auto-fill,minmax(min(340px,100%),1fr))";
}

// Control segmentado sobre fondo de card: legible sobre el degradé en cualquier tema.
function Segmentado({ etiqueta, opciones, valor, onCambiar }) {
  return (
    <div className="segmented" role="group" aria-label={etiqueta}>
      <span className="segmented__label" aria-hidden="true">
        {etiqueta}
      </span>
      {opciones.map((o) => (
        <button key={o.value} type="button" className="segmented__item" aria-pressed={valor === o.value} onClick={() => onCambiar(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { nombre, email, puede } = useAuth();
  const { tema, setTema, modo, setModo } = useTheme();
  const celular = useCelular();
  const [columnas, setColumnas] = useState(() => localStorage.getItem(COLUMNAS_KEY) || "auto");

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
      <div
        className="sobre-fondo"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}
      >
        <Segmentado etiqueta="Tema" opciones={TEMAS} valor={tema} onCambiar={setTema} />
        <Segmentado etiqueta="Modo" opciones={MODOS} valor={modo} onCambiar={setModo} />
        {/* En el celular el selector de columnas no se ve: siempre una card por fila. */}
        <div className="columnas-selector" style={{ alignItems: "center", gap: "var(--space-2)" }}>
          <span id="columnas-etiqueta" className="t-footnote" style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-on-app-muted)" }}>
            Cards por fila
          </span>
          <Select
            aria-labelledby="columnas-etiqueta"
            titulo="Cards por fila"
            size="sm"
            options={OPCIONES_COLUMNAS}
            value={columnas}
            onChange={setColumnas}
            style={{ width: 96 }}
          />
        </div>
      </div>
      <div style={celular ? GRILLA_CELULAR : { display: "grid", gridTemplateColumns: gridColumnas(columnas), gap: "var(--space-5)" }}>
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
