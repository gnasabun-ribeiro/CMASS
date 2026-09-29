import { supabase, supabaseConfigured } from "./supabaseClient.js";

// Lee public.centros_de_costos (sincronizada desde el DW de Finnegans por la
// Edge Function DW_FINNEGANS). Cada fila guarda el registro del DW en `data`.
//
// La lista se copia en el dispositivo cada vez que se baja bien, para que el
// selector de Cliente siga funcionando sin conexión.
const CACHE_KEY = "cmass:centros-de-costos";

function leerCache() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarCache(lista) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(lista));
  } catch {
    // sin espacio o almacenamiento bloqueado: se sigue sin copia local
  }
}

async function bajarCentros() {
  const { data, error } = await supabase.from("centros_de_costos").select("data");
  if (error) throw error;

  return (data || [])
    .map((r) => r.data || {})
    .filter((c) => String(c.activo).toLowerCase() === "true" && c.nombre)
    .map((c) => ({
      id: c.centrocostoid,
      codigo: c.codigo,
      nombre: c.nombre,
      etiqueta: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre,
    }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es", { numeric: true }));
}

export async function listarCentrosDeCostos() {
  if (!supabaseConfigured) return [];
  const copia = leerCache();
  if (!navigator.onLine && copia) return copia;
  try {
    const lista = await bajarCentros();
    guardarCache(lista);
    return lista;
  } catch (err) {
    if (copia) return copia; // sin conexión o servidor caído: se usa la última copia buena
    throw err;
  }
}
