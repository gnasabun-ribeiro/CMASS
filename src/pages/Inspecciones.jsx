import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import ModuleCard from "../components/ModuleCard.jsx";
import { findModulo, GRUPO_INSPECCIONES } from "../data/modulos.js";

export default function Inspecciones() {
  const navigate = useNavigate();
  const modulos = GRUPO_INSPECCIONES.modulos.map(findModulo).filter(Boolean);

  const openModulo = (m) => navigate(m.form ? `/form/${m.id}` : `/modulos/${m.id}`);

  return (
    <AppShell title={GRUPO_INSPECCIONES.title} subtitle="Elegí el tipo de inspección" onBack={() => navigate("/")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
          gap: 18,
        }}
      >
        {modulos.map((m, i) => (
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
