import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { alLlegarNotificacion, conectarNotificaciones, desconectarNotificaciones } from "../lib/notificaciones.js";
import { estadoAvisos, mostrarAvisoLocal } from "../lib/push.js";
import { toast } from "./ui/Toast.jsx";

const TOAST = { success: "success", error: "error", warning: "warning", info: "info" };

// Conecta la campana con las notificaciones del servidor (tiempo real) y decide cómo avisar
// cuando llega una: con la app a la vista, un toast; con la pestaña oculta y los avisos del
// navegador activados (sin push), un aviso del sistema. Con push activo lo muestra el service
// worker (public/push-sw.js), que también pide navegar al tocar el aviso.
export default function NotificacionesDelServidor() {
  const { userId, isAuthenticated } = useAuth();
  // navigate cambia con cada pantalla: va por ref, así el canal no se reconecta al navegar.
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;
    conectarNotificaciones(userId);
    const dejar = alLlegarNotificacion(async (n) => {
      if (document.visibilityState === "visible") {
        toast[TOAST[n.tipo] || "info"](n.titulo, {
          descripcion: n.descripcion,
          accion: n.ruta ? { label: "Ver", onClick: () => navigateRef.current(n.ruta) } : undefined,
        });
      } else if ((await estadoAvisos()) === "en-segundo-plano") {
        mostrarAvisoLocal(n);
      }
    });
    return () => {
      dejar();
      desconectarNotificaciones();
    };
  }, [isAuthenticated, userId]);

  // Al tocar un aviso del sistema con la app abierta, el service worker pide ir a esa pantalla.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const alMensaje = (e) => {
      if (e.data?.tipo === "abrir-ruta" && typeof e.data.ruta === "string" && e.data.ruta.startsWith("/")) navigateRef.current(e.data.ruta);
    };
    navigator.serviceWorker.addEventListener("message", alMensaje);
    return () => navigator.serviceWorker.removeEventListener("message", alMensaje);
  }, []);

  return null;
}
