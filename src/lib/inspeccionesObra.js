import { supabase } from "./supabaseClient.js";

export async function crearBorradorObra(inspectorId) {
  const { data, error } = await supabase
    .from("inspecciones_obra")
    .insert({ inspector_id: inspectorId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function guardarGeneralesObra(inspeccionId, generales) {
  const { error } = await supabase
    .from("inspecciones_obra")
    .update({
      cliente: generales.cliente || null,
      ubicacion: generales.ubicacion || null,
      grupo_auditado: generales.grupoAuditado || null,
      fecha_hora: generales.fechaHora ? new Date(generales.fechaHora).toISOString() : null,
      tarea_observada: generales.tareaObservada || null,
    })
    .eq("id", inspeccionId);
  if (error) throw error;
}

export async function guardarRespuestaChecklist(inspeccionId, item, valor) {
  const { error } = await supabase.from("inspecciones_obra_checklist").upsert(
    {
      inspeccion_id: inspeccionId,
      codigo: item.codigo,
      categoria: item.categoria,
      item: item.texto,
      valor,
    },
    { onConflict: "inspeccion_id,codigo" }
  );
  if (error) throw error;
}

export async function marcarEnviadaObra(inspeccionId) {
  const { error } = await supabase.from("inspecciones_obra").update({ estado: "enviado" }).eq("id", inspeccionId);
  if (error) throw error;
}
