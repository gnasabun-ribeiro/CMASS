import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Modulo from "./pages/Modulo.jsx";
import Lista from "./pages/Lista.jsx";
import Formulario from "./pages/Formulario/index.jsx";
import Pendientes from "./pages/Pendientes.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/modulos/:moduloId" element={<Modulo />} />
          <Route path="/modulos/:moduloId/form/:subId" element={<Formulario />} />
          <Route path="/modulos/:moduloId/registros/:subId" element={<Lista />} />
          <Route path="/form/:moduloId" element={<Formulario />} />
          <Route path="/registros" element={<Lista />} />
          <Route path="/registros/:moduloId" element={<Lista />} />
          <Route path="/pendientes" element={<Pendientes />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
