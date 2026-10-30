import { supabase } from "./supabaseClient.js";

// Avisos del navegador ("Avisos en este dispositivo" en la campana). Dos niveles:
//   * Con la app cerrada (Web Push): hace falta VITE_VAPID_PUBLIC_KEY en el .env, la Edge
//     Function enviar-push y la parte 6 de supabase/notificaciones.sql. El service worker solo
//     existe en el build de producción (npm run build && npm run preview), no en npm run dev.
//   * Sin eso, con la app abierta en segundo plano: NotificacionesDelServidor muestra el aviso
//     del sistema cuando llega una notificación y la pestaña no está a la vista.
// El permiso se pide solo al tocar "Activar" (nunca al cargar).

const CLAVE_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const avisosSoportados = () => typeof window !== "undefined" && "Notification" in window;
export const pushConfigurado = () => Boolean(CLAVE_VAPID) && "serviceWorker" in navigator && "PushManager" in window;

function claveABytes(base64) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

// El service worker, si ya está registrado (en desarrollo no hay: se devuelve null enseguida).
async function registro() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) || null;
}

async function suscripcionActual() {
  const reg = await registro();
  return reg?.pushManager ? reg.pushManager.getSubscription() : null;
}

// "no-soportado" | "bloqueado" | "activo" (push con la app cerrada) | "en-segundo-plano"
// (permiso dado, sin push) | "inactivo"
export async function estadoAvisos() {
  if (!avisosSoportados()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return "inactivo";
  if (pushConfigurado() && (await suscripcionActual().catch(() => null))) return "activo";
  return "en-segundo-plano";
}

export async function activarAvisos() {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error(permiso === "denied" ? "El navegador bloqueó los avisos de esta app." : "No se dio permiso.");
  if (!pushConfigurado()) return "en-segundo-plano";
  const reg = await registro();
  if (!reg) return "en-segundo-plano"; // sin service worker (ej. npm run dev)
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(CLAVE_VAPID) }));
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase.rpc("registrar_push", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth });
  if (error) throw new Error(error.message);
  return "activo";
}

// Deja de recibir push en este dispositivo (también al cerrar sesión: si entra otra persona,
// no le llegan los avisos de la anterior). El permiso del navegador queda: lo saca el usuario.
export async function desactivarAvisos() {
  const sub = await suscripcionActual().catch(() => null);
  if (!sub) return;
  try {
    await supabase.rpc("quitar_push", { p_endpoint: sub.endpoint });
  } catch {
    /* sin conexión: la suscripción del servidor se borra sola cuando el navegador la rechace */
  }
  await sub.unsubscribe().catch(() => {});
}

// Aviso del sistema mientras la app está abierta pero no a la vista (sin push).
export async function mostrarAvisoLocal({ id, titulo, descripcion }) {
  if (!avisosSoportados() || Notification.permission !== "granted") return;
  const opciones = { body: descripcion || "", icon: "/icon-192.png", tag: id, lang: "es" };
  const reg = await registro();
  if (reg) return reg.showNotification(titulo, opciones);
  // eslint-disable-next-line no-new
  new Notification(titulo, opciones);
}
