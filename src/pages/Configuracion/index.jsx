import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { Aviso } from "../Panel/ui.jsx";
import Usuarios from "./Usuarios.jsx";

// Pestaña "Configuración" de la barra inferior. Por ahora solo tiene la gestión de usuarios
// (altas, roles, bajas), que antes era una pestaña del panel de seguimiento.
export default function Configuracion() {
  const navigate = useNavigate();
  const { puede, rolListo, userId } = useAuth();

  // Evita mostrar "sin permiso" mientras todavía se está leyendo el rol.
  if (!rolListo) return <AppShell title="Configuración" onBack={() => navigate("/")}>{null}</AppShell>;
  if (!puede("gestionarUsuarios")) {
    return (
      <AppShell title="Configuración" onBack={() => navigate("/")}>
        <Aviso>Tu rol no tiene acceso a la configuración.</Aviso>
      </AppShell>
    );
  }

  return (
    <AppShell title="Configuración" subtitle="Usuarios y roles" onBack={() => navigate("/")}>
      <Usuarios userId={userId} />
    </AppShell>
  );
}
