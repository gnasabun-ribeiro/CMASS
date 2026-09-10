import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import SubItemCard from "../components/SubItemCard.jsx";
import { findModulo } from "../data/modulos.js";

export default function Modulo() {
  const { moduloId } = useParams();
  const navigate = useNavigate();
  const modulo = findModulo(moduloId);

  if (!modulo || !modulo.subs) return <Navigate to="/" replace />;

  return (
    <AppShell title={modulo.title} subtitle={modulo.desc} onBack={() => navigate("/")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          gap: 12,
        }}
      >
        {modulo.subs.map((sub, i) => (
          <SubItemCard
            key={sub.id}
            sub={sub}
            index={i}
            onNuevo={() => navigate(`/modulos/${modulo.id}/form/${sub.id}`)}
            onRegistros={() => navigate(`/modulos/${modulo.id}/registros/${sub.id}`)}
          />
        ))}
      </div>
    </AppShell>
  );
}
