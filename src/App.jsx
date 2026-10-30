import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { alSincronizar, iniciarSync } from "./lib/sync.js";
import { notificar } from "./lib/notificaciones.js";
import { toast } from "./components/ui/Toast.jsx";
import { findModulo, findSub, rutaFormulario } from "./data/modulos.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { listarCentrosDeCostos } from "./lib/centrosDeCostos.js";
import { listarColaboradores } from "./lib/colaboradores.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import NotificacionesDelServidor from "./components/NotificacionesDelServidor.jsx";

// Cada pantalla se baja recién cuando se abre (Login e Inicio van en el paquete principal: son
// las primeras que se ven). Con la app instalada el service worker ya las tiene todas, y al
// entrar se precargan en segundo plano (PrecargaOffline): navegar no espera la descarga.
const PANTALLAS = {
  Inspecciones: () => import("./pages/Inspecciones.jsx"),
  Modulo: () => import("./pages/Modulo.jsx"),
  Lista: () => import("./pages/Lista.jsx"),
  Formulario: () => import("./pages/Formulario/index.jsx"),
  Pendientes: () => import("./pages/Pendientes.jsx"),
  Panel: () => import("./pages/Panel/index.jsx"),
  Configuracion: () => import("./pages/Configuracion/index.jsx"),
  CambiarClave: () => import("./pages/CambiarClave.jsx"),
};
const Inspecciones = lazy(PANTALLAS.Inspecciones);
const Modulo = lazy(PANTALLAS.Modulo);
const Lista = lazy(PANTALLAS.Lista);
const Formulario = lazy(PANTALLAS.Formulario);
const Pendientes = lazy(PANTALLAS.Pendientes);
const Panel = lazy(PANTALLAS.Panel);
const Configuracion = lazy(PANTALLAS.Configuracion);
const CambiarClave = lazy(PANTALLAS.CambiarClave);

// Mientras baja una pantalla por primera vez: el fondo de la app y, si tarda, un indicador.
function CargandoPantalla() {
  return (
    <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }} aria-busy="true">
      <span className="spinner cargando-demorado" style={{ width: 28, height: 28, color: "var(--text-on-app)" }} role="status" aria-label="Cargando" />
    </div>
  );
}

// Deja lista en el dispositivo la información que se necesita sin conexión.
function PrecargaOffline() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;
    // Las pantallas, cuando el navegador está libre.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => Object.values(PANTALLAS).forEach((cargar) => cargar().catch(() => {})));
    if (!navigator.onLine) return;
    listarCentrosDeCostos().catch(() => {});
    listarColaboradores().catch(() => {}); // al salir se borra la copia: se vuelve a bajar al entrar
  }, [isAuthenticated]);
  return null;
}

// Lo que pasa en el envío en segundo plano va al centro de notificaciones (campana). Un
// error además se avisa en pantalla: hay que revisarlo en Pendientes.
function NotificacionesDeSync() {
  const navigate = useNavigate();
  useEffect(
    () =>
      alSincronizar(({ tipo, inspeccionId, rec, uid, mensaje }) => {
        const moduloId = rec?.moduloId ?? "obra"; // las copias viejas no traen módulo: eran de obra
        const nombre = findSub(moduloId, rec?.subId)?.title || findModulo(moduloId)?.title || "Inspección";
        const cual = `${nombre} — ${rec?.generales?.cliente || "Sin cliente"}`;
        if (tipo === "enviada") {
          notificar(uid, { tipo: "success", titulo: "Inspección enviada", descripcion: cual, ruta: rutaFormulario(moduloId, rec?.subId, inspeccionId) });
        } else if (tipo === "error") {
          notificar(uid, { tipo: "error", titulo: "No se pudo enviar una inspección", descripcion: `${cual}: ${mensaje}`, ruta: "/pendientes" });
          toast.error("No se pudo enviar una inspección", {
            descripcion: "Quedó guardada en el dispositivo y se reintenta sola.",
            accion: { label: "Ver", onClick: () => navigate("/pendientes") },
          });
        }
      }),
    [navigate]
  );
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
      <NotificacionesDeSync />
      <NotificacionesDelServidor />
      <Suspense fallback={<CargandoPantalla />}>
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
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/cambiar-clave" element={<CambiarClave />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}
