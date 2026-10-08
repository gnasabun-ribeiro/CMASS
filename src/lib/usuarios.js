import { supabase } from "./supabaseClient.js";

// Altas de usuarios (solo administrador). Ver supabase/functions/admin-usuarios y
// supabase/usuarios_alta.sql.

const PAGINA = 1000; // tope de filas por consulta de Supabase

// Personas de la tabla colaboradores, una vez cada una. La tabla repite a quien tiene varios
// centros de costos; la clave estable es <base>|<numerolegajo>. Incluye a quienes no tienen
// correo corporativo: a esos se les asigna uno al darlos de alta.
export async function listarColaboradoresParaAlta() {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("colaboradores")
      .select("nombre_completo, correo, base:data->>base, legajo:data->>numerolegajo, funcion:data->>funcion")
      .not("nombre_completo", "is", null)
      .order("id")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...data);
    if (data.length < PAGINA) break;
  }

  const porClave = new Map();
  for (const f of filas) {
    const clave = `${f.base}|${f.legajo}`;
    const actual = porClave.get(clave);
    if (!actual || (!actual.correo && f.correo)) {
      porClave.set(clave, {
        clave,
        base: f.base,
        legajo: f.legajo,
        // `etiqueta` es lo que busca filtrarColaboradores (lib/colaboradores.js)
        etiqueta: f.nombre_completo,
        correo: f.correo || "",
        funcion: f.funcion || "",
      });
    }
  }
  return [...porClave.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
}

// Crea el usuario con contraseña temporal. Devuelve { usuario, claveTemporal, correoGuardadoEnColaboradores }.
export async function crearUsuario({ nombre, correo, rol, base, legajo }) {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", {
    body: { accion: "crear", nombre, correo, rol, base, legajo },
  });
  if (error) {
    // Un error HTTP trae la respuesta de la función con el motivo en `error`.
    let motivo = null;
    try {
      motivo = (await error.context?.json?.())?.error;
    } catch {
      /* sin cuerpo legible */
    }
    throw new Error(motivo || "No se pudo crear el usuario. Revisá la conexión y probá de nuevo.");
  }
  if (!data?.ok) throw new Error(data?.error || "No se pudo crear el usuario.");
  return data;
}
