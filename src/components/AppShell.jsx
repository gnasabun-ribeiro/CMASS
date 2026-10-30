import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import TabBar from "./TabBar.jsx";
import { toast } from "./ui/Toast.jsx";

// Marco de cada pantalla: encabezado fijo arriba, navegación (barra inferior en el celular,
// riel en tablet, barra lateral en la computadora) y el contenido centrado.
// `barraAcciones`: botones fijos abajo (Borrador / Siguiente del formulario), justo arriba
// de la barra de navegación.
export default function AppShell({ title, subtitle, onBack, barraAcciones, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Aviso de una acción que terminó en otra pantalla (ej. "Inspección enviada"): llega con
  // navigate(ruta, { state: { aviso } }), se muestra como toast y se borra del historial
  // (así no reaparece al volver atrás).
  const aviso = location.state?.aviso;
  const avisadoRef = useRef(null); // una vez por entrada del historial (StrictMode corre el efecto dos veces)
  useEffect(() => {
    if (!aviso || avisadoRef.current === location.key) return;
    avisadoRef.current = location.key;
    const texto = typeof aviso === "string" ? aviso : aviso.titulo;
    if (typeof aviso === "object" && aviso.tipo === "warning") toast.warning(texto, { descripcion: aviso.descripcion });
    else toast.success(texto, { descripcion: aviso.descripcion });
    navigate(location.pathname + location.search, { replace: true, state: { ...location.state, aviso: undefined } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso]);

  return (
    <div className="app-shell">
      <Header title={title} subtitle={subtitle} onBack={onBack} />

      <main className={`app-main${barraAcciones ? " app-main--con-barra" : ""}`}>
        <div className="app-screen">{children}</div>
      </main>

      {barraAcciones ? (
        <div className="barra-acciones">
          <div className="barra-acciones__inner">{barraAcciones}</div>
        </div>
      ) : null}

      <TabBar />
    </div>
  );
}
