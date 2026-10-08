import { supabase } from "./supabaseClient.js";
import { TABLAS_GENERICAS, TABLAS_OBRA } from "./tablas.js";

// Datos del panel de seguimiento. Todo se lee con RLS: lo que llega es lo que el rol puede ver.

// Antes de ejecutar supabase/roles_y_permisos.sql no existen estas columnas ni funciones.
export const faltaMigracion = (error) =>
  Boolean(error) && (["PGRST204", "PGRST200", "42703"].includes(error.code) || /estado|rol|activo/.test(String(error.message)));

export const MENSAJE_MIGRACION = "Falta ejecutar supabase/roles_y_permisos.sql en Supabase (SQL Editor).";

const hoy = () => new Date().toISOString().slice(0, 10);

// Hallazgos de inspecciones ya enviadas (los de borradores todavía pueden cambiar).
export async function listarHallazgos() {
  const una = async (t) => {
    const cabecera = t.generico
      ? "inspeccion:inspecciones!inner(id, modulo_id, sub_id, cliente, ubicacion, estado, inspector:profiles(nombre))"
      : "inspeccion:inspecciones_obra!inner(id, cliente, ubicacion, estado, inspector:profiles(nombre))";
    const { data, error } = await supabase
      .from(t.hallazgos)
      .select(`id, titulo, severidad, detalle, responsable, vence, estado, cerrado_at, nota_cierre, created_at, ${cabecera}`)
      .eq("inspeccion.estado", "enviado")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map((h) => ({
      id: h.id,
      titulo: h.titulo,
      severidad: h.severidad,
      detalle: h.detalle || "",
      responsable: h.responsable || "",
      vence: h.vence || "",
      estado: h.estado,
      cerradoAt: h.cerrado_at,
      notaCierre: h.nota_cierre || "",
      creado: h.created_at,
      inspeccionId: h.inspeccion.id,
      moduloId: t.generico ? h.inspeccion.modulo_id : "obra",
      subId: t.generico ? h.inspeccion.sub_id : null,
      cliente: h.inspeccion.cliente || "",
      ubicacion: h.inspeccion.ubicacion || "",
      inspector: h.inspeccion.inspector?.nombre || "",
      tabla: t.generico ? "generico" : "obra",
      vencido: h.estado === "abierto" && Boolean(h.vence) && h.vence < hoy(),
    }));
  };
  const [obra, resto] = await Promise.all([una(TABLAS_OBRA), una(TABLAS_GENERICAS)]);
  return [...obra, ...resto].sort((a, b) => (a.creado < b.creado ? 1 : -1));
}

export async function cambiarEstadoHallazgo(h, estado, userId, nota) {
  const t = h.tabla === "generico" ? TABLAS_GENERICAS : TABLAS_OBRA;
  const cambios =
    estado === "cerrado"
      ? { estado, cerrado_at: new Date().toISOString(), cerrado_por: userId, nota_cierre: nota?.trim() || null }
      : { estado, cerrado_at: null, cerrado_por: null, nota_cierre: null };
  const { data, error } = await supabase.from(t.hallazgos).update(cambios).eq("id", h.id).select("id");
  if (error) throw error;
  // RLS no avisa cuando no deja: simplemente no actualiza ninguna fila.
  if (!data?.length) throw new Error("Tu rol no permite cambiar este hallazgo.");
}

// Inspecciones enviadas, para contar por inspector, módulo y mes.
export async function listarInspeccionesEnviadas() {
  const una = async (t) => {
    const columnas = t.generico ? "id, modulo_id, sub_id, created_at, inspector:profiles(nombre)" : "id, created_at, inspector:profiles(nombre)";
    const { data, error } = await supabase.from(t.cab).select(columnas).eq("estado", "enviado");
    if (error) throw error;
    return data.map((r) => ({
      id: r.id,
      moduloId: t.generico ? r.modulo_id : "obra",
      subId: t.generico ? r.sub_id : null,
      creado: r.created_at,
      inspector: r.inspector?.nombre || "Sin nombre",
    }));
  };
  const [obra, resto] = await Promise.all([una(TABLAS_OBRA), una(TABLAS_GENERICAS)]);
  return [...obra, ...resto];
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nombre, rol, activo, created_at")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function actualizarUsuario(id, cambios) {
  const { data, error } = await supabase.from("profiles").update(cambios).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo actualizar: tu rol no lo permite.");
}
