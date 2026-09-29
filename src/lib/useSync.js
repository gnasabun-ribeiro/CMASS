import { useSyncExternalStore } from "react";
import { obtenerEstado, suscribir } from "./sync.js";

// Estado de la sincronización: { pendientes, sincronizando, ultimaSync, errores, online }.
export function useSync() {
  return useSyncExternalStore(suscribir, obtenerEstado);
}
