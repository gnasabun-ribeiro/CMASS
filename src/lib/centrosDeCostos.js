import { supabase, supabaseConfigured } from "./supabaseClient.js";

// Lee public.centros_de_costos (sincronizada desde el DW de Finnegans por la
// Edge Function DW_FINNEGANS). Cada fila guarda el registro del DW en `data`.
export async function listarCentrosDeCostos() {
  if (!supabaseConfigured) return [];
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
