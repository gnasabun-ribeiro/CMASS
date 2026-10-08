// Alta de usuarios desde la app (Panel > Usuarios > Agregar usuario).
// Crear un usuario de Supabase Auth necesita la service role key, que no puede estar en
// el navegador: por eso va en esta Edge Function. Solo la puede usar un administrador
// activo (se verifica con el token de quien llama).
//
// Acción "crear": { accion, nombre, correo, rol, base?, legajo? }
//   1. crea el usuario con contraseña temporal aleatoria (ya confirmado, sin mail) y la
//      marca para que tenga que cambiarla al primer ingreso (user_metadata.debe_cambiar_clave);
//   2. le pone nombre y rol en public.profiles;
//   3. si viene de la lista de colaboradores (base + legajo) y esa persona no tenía correo,
//      se lo guarda en public.colaboradores y en public.colaboradores_correos (para que la
//      próxima sincronización con el DW no se lo borre; ver supabase/usuarios_alta.sql).
// Devuelve la contraseña temporal una sola vez, para que el administrador se la pase.
//
// Deploy: Dashboard > Edge Functions > New function > admin-usuarios (con verify JWT
// activado) > pegar este archivo. Usa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, que
// Supabase inyecta solo; no hay secrets nuevos.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["administrador", "supervisor", "inspector", "lectura"];
const DOMINIO = "@ribeirosrl.com.ar";

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "content-type": "application/json" } });

// 12 caracteres sin los que se confunden al dictarlos (0/O, 1/l/I).
function claveTemporal() {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { ok: false, error: "método no permitido" });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quien, error: errorToken } = await admin.auth.getUser(token);
    if (errorToken || !quien.user) return responder(401, { ok: false, error: "Sesión inválida." });

    const { data: yo } = await admin.from("profiles").select("rol, activo").eq("id", quien.user.id).maybeSingle();
    if (!yo || yo.rol !== "administrador" || !yo.activo) {
      return responder(403, { ok: false, error: "Solo un administrador puede dar de alta usuarios." });
    }

    const body = await req.json().catch(() => ({}));
    if (body.accion !== "crear") return responder(400, { ok: false, error: "Acción desconocida." });

    const correo = String(body.correo ?? "").trim().toLowerCase();
    const nombre = String(body.nombre ?? "").trim();
    const rol = String(body.rol ?? "inspector");
    if (!/^[^\s@]+@[^\s@]+$/.test(correo) || !correo.endsWith(DOMINIO)) {
      return responder(400, { ok: false, error: `El correo tiene que ser ${DOMINIO}.` });
    }
    if (!nombre) return responder(400, { ok: false, error: "Falta el nombre." });
    if (!ROLES.includes(rol)) return responder(400, { ok: false, error: "Rol inválido." });

    const clave = claveTemporal();
    const { data: creado, error: errorAlta } = await admin.auth.admin.createUser({
      email: correo,
      password: clave,
      email_confirm: true,
      user_metadata: { debe_cambiar_clave: true },
    });
    if (errorAlta || !creado.user) {
      const yaExiste = /already|registered|exists/i.test(errorAlta?.message ?? "");
      return responder(yaExiste ? 409 : 500, {
        ok: false,
        error: yaExiste ? "Ya existe un usuario con ese correo." : `No se pudo crear el usuario: ${errorAlta?.message}`,
      });
    }

    // El perfil lo crea un trigger al insertarse en auth.users; acá se completa.
    const { error: errorPerfil } = await admin
      .from("profiles")
      .upsert({ id: creado.user.id, email: correo, nombre, rol, activo: true }, { onConflict: "id" });
    if (errorPerfil) {
      // Sin perfil el usuario queda a medias: se borra para poder reintentar.
      await admin.auth.admin.deleteUser(creado.user.id);
      return responder(500, { ok: false, error: `No se pudo guardar el perfil: ${errorPerfil.message}` });
    }

    // Correo de la persona en la lista de colaboradores (solo si no tenía uno).
    let correoGuardadoEnColaboradores = false;
    const base = body.base == null ? "" : String(body.base);
    const legajo = body.legajo == null ? "" : String(body.legajo);
    if (base && legajo) {
      const { data: filas, error: errorColab } = await admin
        .from("colaboradores")
        .update({ correo })
        .eq("data->>base", base)
        .eq("data->>numerolegajo", legajo)
        .or("correo.is.null,correo.eq.")
        .select("id");
      if (!errorColab && filas && filas.length > 0) {
        correoGuardadoEnColaboradores = true;
        await admin
          .from("colaboradores_correos")
          .upsert({ clave: `${base}|${legajo}`, correo, asignado_por: quien.user.id }, { onConflict: "clave" });
      }
    }

    return responder(200, {
      ok: true,
      usuario: { id: creado.user.id, correo, nombre, rol },
      claveTemporal: clave,
      correoGuardadoEnColaboradores,
    });
  } catch (err) {
    console.error(err);
    return responder(500, { ok: false, error: "Error inesperado al crear el usuario." });
  }
});
