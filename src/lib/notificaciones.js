import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import { uuid } from "./uuid.js";

/* =====================================================================================
   Centro de notificaciones (campana del encabezado). Junta dos fuentes:

   * Servidor: tabla `notificaciones` (supabase/notificaciones.sql). Las crea la base sola
     (hallazgo asignado, hallazgo crítico, hallazgo cerrado, vence mañana / venció) y llegan en
     tiempo real (Realtime). Se guarda una copia para verlas sin conexión. Si la tabla todavía
     no existe (falta ejecutar el SQL), se sigue solo con las del dispositivo, sin error.
   * Dispositivo: lo que pasa en el envío en segundo plano ("Inspección enviada", "No se pudo
     enviar"), en localStorage `cmass:notificaciones:<userId>` (App.jsx → NotificacionesDeSync).

   No se muestran datos de ejemplo.
   Notificacion: { id, tipo: "success" | "error" | "warning" | "info", titulo, descripcion?,
                   fecha (ISO), leida, ruta?, origen: "servidor" | "dispositivo" }
   ===================================================================================== */

const MAXIMO = 50;
const claveLocal = (userId) => `cmass:notificaciones:${userId}`;
const claveCopia = (userId) => `cmass:notificaciones-servidor:${userId}`;
const cambios = new Set();
const avisarCambio = () => cambios.forEach((fn) => fn());

const leerJson = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) || [];
  } catch {
    return [];
  }
};
const escribirJson = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: no se guarda */
  }
};

// ---------- Dispositivo ----------
const leerLocal = (userId) => leerJson(claveLocal(userId)).map((n) => ({ ...n, origen: "dispositivo" }));
function escribirLocal(userId, lista) {
  escribirJson(claveLocal(userId), lista.slice(0, MAXIMO));
  avisarCambio();
}

// Agrega una notificación del dispositivo para ese usuario.
export function notificar(userId, { tipo = "info", titulo, descripcion, ruta }) {
  if (!userId || !titulo) return;
  escribirLocal(userId, [{ id: uuid(), tipo, titulo, descripcion, ruta, fecha: new Date().toISOString(), leida: false }, ...leerJson(claveLocal(userId))]);
}

// ---------- Servidor ----------
let servidorNoDisponible = false; // la tabla no existe todavía: no se vuelve a consultar en esta sesión
const tablaInexistente = (e) => ["42P01", "PGRST205", "PGRST202"].includes(e?.code) || /does not exist|could not find the table/i.test(e?.message || "");

const deServidor = (n) => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  descripcion: n.descripcion,
  ruta: n.ruta,
  leida: n.leida,
  fecha: n.created_at,
  origen: "servidor",
});

async function cargarServidor(userId) {
  if (!supabase || servidorNoDisponible) return { lista: [] };
  try {
    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, tipo, titulo, descripcion, ruta, leida, created_at")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAXIMO);
    if (error) throw error;
    const lista = data.map(deServidor);
    escribirJson(claveCopia(userId), lista);
    return { lista };
  } catch (e) {
    if (tablaInexistente(e)) {
      servidorNoDisponible = true;
      return { lista: [] };
    }
    // Sin conexión no es un error: se muestra la última copia.
    return { lista: leerJson(claveCopia(userId)), aviso: navigator.onLine ? "No se pudieron actualizar las notificaciones del servidor." : null };
  }
}

// Tiempo real: un canal por usuario logueado (lo abre NotificacionesDelServidor).
let canal = null;
let canalDe = null;
const llegadas = new Set();
export const alLlegarNotificacion = (fn) => {
  llegadas.add(fn);
  return () => llegadas.delete(fn);
};

export function conectarNotificaciones(userId) {
  if (!supabase || !userId || canalDe === userId) return;
  desconectarNotificaciones();
  canalDe = userId;
  canal = supabase
    .channel(`notificaciones-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${userId}` }, (cambio) => {
      avisarCambio();
      if (cambio.eventType === "INSERT") llegadas.forEach((fn) => fn(deServidor(cambio.new)));
    })
    .subscribe();
}

export function desconectarNotificaciones() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
  canalDe = null;
}

// Cambiar algo en el servidor: si falla, se avisa en la lista pero no se rompe nada.
async function enServidor(consulta) {
  if (!supabase || servidorNoDisponible) return;
  const { error } = await consulta;
  if (error) throw error;
}

// ---------- Fuente combinada ----------
export const fuente = {
  async cargar(userId) {
    const servidor = await cargarServidor(userId);
    const lista = [...leerLocal(userId), ...servidor.lista].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, MAXIMO);
    return { lista, aviso: servidor.aviso };
  },
  suscribir(userId, alCambiar) {
    cambios.add(alCambiar);
    // Otra pestaña de la app con el mismo usuario.
    const alGuardarEnOtra = (e) => (e.key === claveLocal(userId) || e.key === claveCopia(userId)) && alCambiar();
    window.addEventListener("storage", alGuardarEnOtra);
    return () => {
      cambios.delete(alCambiar);
      window.removeEventListener("storage", alGuardarEnOtra);
    };
  },
  async marcarLeidas(userId, notificaciones) {
    const locales = new Set(notificaciones.filter((n) => n.origen === "dispositivo").map((n) => n.id));
    const remotas = notificaciones.filter((n) => n.origen === "servidor").map((n) => n.id);
    if (locales.size) escribirLocal(userId, leerJson(claveLocal(userId)).map((n) => (locales.has(n.id) ? { ...n, leida: true } : n)));
    if (remotas.length) {
      await enServidor(supabase.from("notificaciones").update({ leida: true }).in("id", remotas));
      escribirJson(claveCopia(userId), leerJson(claveCopia(userId)).map((n) => (remotas.includes(n.id) ? { ...n, leida: true } : n)));
      avisarCambio();
    }
  },
  async descartar(userId, n) {
    if (n.origen === "dispositivo") return escribirLocal(userId, leerJson(claveLocal(userId)).filter((x) => x.id !== n.id));
    await enServidor(supabase.from("notificaciones").delete().eq("id", n.id));
    escribirJson(claveCopia(userId), leerJson(claveCopia(userId)).filter((x) => x.id !== n.id));
    avisarCambio();
  },
};

// Al cerrar sesión (tiene textos de inspecciones): AuthContext.
export function borrarCopiaNotificaciones(userId) {
  try {
    localStorage.removeItem(claveCopia(userId));
  } catch {
    /* nada */
  }
}

// { notificaciones, noLeidas, cargando, error, aviso, reintentar, marcarLeida, marcarTodasLeidas, descartar }
export function useNotifications() {
  const { userId } = useAuth();
  const [estado, setEstado] = useState({ lista: [], cargando: true, error: null, aviso: null });

  // Solo la primera carga muestra "cargando"; los cambios posteriores se aplican sin parpadeo.
  const cargar = useCallback(
    (silencioso = false) => {
      if (!userId) {
        setEstado({ lista: [], cargando: false, error: null, aviso: null });
        return;
      }
      if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }));
      fuente
        .cargar(userId)
        .then(({ lista, aviso }) => setEstado({ lista, cargando: false, error: null, aviso: aviso || null }))
        .catch((err) => setEstado((e) => ({ ...e, cargando: false, error: err?.message || "No se pudieron cargar las notificaciones" })));
    },
    [userId]
  );

  useEffect(() => {
    cargar();
    if (!userId) return undefined;
    return fuente.suscribir(userId, () => cargar(true));
  }, [cargar, userId]);

  // Los cambios se ven al instante; si el servidor falla, vuelve a lo que había y se avisa.
  const aplicar = (cambiarLista, accion) => {
    setEstado((e) => ({ ...e, lista: cambiarLista(e.lista) }));
    accion().catch(() => {
      setEstado((e) => ({ ...e, aviso: "No se pudo guardar el cambio. Revisá la conexión." }));
      cargar(true);
    });
  };

  return {
    notificaciones: estado.lista,
    noLeidas: estado.lista.filter((n) => !n.leida).length,
    cargando: estado.cargando,
    error: estado.error,
    aviso: estado.aviso,
    reintentar: () => cargar(),
    marcarLeida: (n) => aplicar((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)), () => fuente.marcarLeidas(userId, [n])),
    marcarTodasLeidas: () => {
      const pendientes = estado.lista.filter((n) => !n.leida);
      aplicar((l) => l.map((x) => ({ ...x, leida: true })), () => fuente.marcarLeidas(userId, pendientes));
    },
    descartar: (n) => aplicar((l) => l.filter((x) => x.id !== n.id), () => fuente.descartar(userId, n)),
  };
}
