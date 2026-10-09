import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { iniciarSync } from "./lib/sync.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { listarCentrosDeCostos } from "./lib/centrosDeCostos.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Inspecciones from "./pages/Inspecciones.jsx";
import Modulo from "./pages/Modulo.jsx";
import Lista from "./pages/Lista.jsx";
import Formulario from "./pages/Formulario/index.jsx";
import Pendientes from "./pages/Pendientes.jsx";
import Panel from "./pages/Panel/index.jsx";
import CambiarClave from "./pages/CambiarClave.jsx";

// Deja lista en el dispositivo la información que se necesita sin conexión.
function PrecargaOffline() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated && navigator.onLine) listarCentrosDeCostos().catch(() => {});
  }, [isAuthenticated]);
  return null;
}

export default function App() {
  // Arranca el envío automático de lo guardado en el dispositivo.
  useEffect(() => {
    iniciarSync();
  }, []);

  return (
    <AuthProvider>
      <PrecargaOffline />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/inspecciones" element={<Inspecciones />} />
          <Route path="/modulos/:moduloId" element={<Modulo />} />
          <Route path="/modulos/:moduloId/form/:subId" element={<Formulario />} />
          <Route path="/modulos/:moduloId/registros/:subId" element={<Lista />} />
          <Route path="/form/:moduloId" element={<Formulario />} />
          <Route path="/registros" element={<Lista />} />
          <Route path="/registros/:moduloId" element={<Lista />} />
          <Route path="/pendientes" element={<Pendientes />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="/cambiar-clave" element={<CambiarClave />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
