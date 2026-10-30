import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import ModuleCard, { GRILLA_CELULAR } from "../components/ModuleCard.jsx";
import { FiltrosIconos } from "../components/IconoAnimado.jsx";
import { findModulo, GRUPO_INSPECCIONES } from "../data/modulos.js";
import { ICONOS_ANIMADOS } from "../data/iconosAnimados.js";
import { useCelular } from "../lib/useCelular.js";

export default function Inspecciones() {
  const navigate = useNavigate();
  const celular = useCelular();
  const modulos = GRUPO_INSPECCIONES.modulos.map(findModulo).filter(Boolean);

  const openModulo = (m) => navigate(m.form ? `/form/${m.id}` : `/modulos/${m.id}`);

  return (
    <AppShell title={GRUPO_INSPECCIONES.title} subtitle="Elegí el tipo de inspección" onBack={() => navigate("/")}>
      <FiltrosIconos />
      <div style={celular ? GRILLA_CELULAR : { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 18 }}>
        {modulos.map((m, i) => (
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
