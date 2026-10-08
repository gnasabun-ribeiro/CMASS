import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading, debeCambiarClave } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // Con contraseña temporal no se entra a nada hasta elegir una propia.
  if (debeCambiarClave && location.pathname !== "/cambiar-clave") return <Navigate to="/cambiar-clave" replace />;
  return <Outlet />;
}
