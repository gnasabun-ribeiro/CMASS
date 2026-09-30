// Sincroniza RIBEIRO_GENERALES_COLABORADORES (DW de Finnegans, Postgres) hacia
// public.colaboradores en Supabase. Misma mecánica que DW_FINNEGANS (centros
// de costos): se invoca por HTTP desde el cron de supabase/colaboradores.sql, o
// a mano para probar.
//
// Deploy sin CLI: Dashboard > Edge Functions > New function > nombre
// DW_COLABORADORES > pegar este archivo entero.
//
// Usa los MISMOS secrets que DW_FINNEGANS (los secrets son por proyecto, no
// hay que cargar nada nuevo): DW_HOST, DW_PORT, DW_DATABASE, DW_USER,
// DW_PASSWORD, SYNC_SECRET, DW_CA_CERT, DW_TLS_SERVERNAME y opcional DW_SCHEMA.
//
// Como todavía no vimos las columnas reales de la tabla origen, cada fila se
// guarda entera como jsonb en `data` (igual que centros_de_costos).

import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

Deno.serve(async (req) => {
  const syncSecret = Deno.env.get("SYNC_SECRET");
  if (!syncSecret) {
    return new Response("falta el secret SYNC_SECRET", { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${syncSecret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  // El certificado del DW lo firma la CA de RDS y está emitido para el host de
  // RDS, no para el alias ribeiro.dw.finneg.com (ver DW_FINNEGANS/index.ts).
  const caCert = Deno.env.get("DW_CA_CERT");
  const tlsServername = Deno.env.get("DW_TLS_SERVERNAME");
  const ssl = caCert
    ? { ca: caCert, ...(tlsServername ? { servername: tlsServername } : {}) }
    : "require";

  const sql = postgres({
    host: Deno.env.get("DW_HOST"),
    port: Number(Deno.env.get("DW_PORT") ?? "5432"),
    database: Deno.env.get("DW_DATABASE"),
    username: Deno.env.get("DW_USER"),
    password: Deno.env.get("DW_PASSWORD"),
    ssl,
    connect_timeout: 10,
  });

  const esquema = Deno.env.get("DW_SCHEMA") || "public";

  try {
    const filas = await sql`
      select * from ${sql(esquema)}.ribeiro_generales_colaboradores
    `;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Las columnas del DW todavía no están confirmadas, así que se buscan por
    // nombre (sin distinguir mayúsculas). Si alguna no se encuentra queda null
    // y se avisa en la respuesta; el registro completo va siempre en `data`.
    const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];
    const buscar = (...patrones: RegExp[]) =>
      columnas.find((c) => patrones.some((p) => p.test(c)));
    const colNombre = buscar(/^(nombres?|first_?name|primer_?nombre)$/i, /^nombre$/i);
    const colApellido = buscar(/^(apellidos?|last_?name)$/i);
    const colCorreo = buscar(/^(correo|email|e_?mail|mail)(_?electronico)?$/i, /(correo|mail)/i);
    const texto = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());

    // Repuebla entera (no hay clave natural conocida para hacer upsert).
    const { error: deleteError } = await supabase
      .from("colaboradores")
      .delete()
      .gte("id", 0);
    if (deleteError) throw deleteError;

    if (filas.length > 0) {
      const { error: insertError } = await supabase
        .from("colaboradores")
        .insert(
          filas.map((fila) => ({
            nombre: colNombre ? texto(fila[colNombre]) : null,
            apellido: colApellido ? texto(fila[colApellido]) : null,
            correo: colCorreo ? texto(fila[colCorreo])?.toLowerCase() ?? null : null,
            data: fila,
          })),
        );
      if (insertError) throw insertError;
    }

    // Sin valores: son datos personales. Solo nombres de columna.
    return new Response(
      JSON.stringify({
        ok: true,
        filas: filas.length,
        columnas,
        mapeo: { nombre: colNombre, apellido: colApellido, correo: colCorreo },
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error(err);

    let candidatas: unknown = undefined;
    if ((err as { code?: string })?.code === "42P01") {
      try {
        candidatas = await sql`
          select table_schema, table_name
          from information_schema.tables
          where table_name ilike '%colaborador%' or table_name ilike '%empleado%'
          order by table_schema, table_name
          limit 50
        `;
      } catch (_) {
        // si tampoco se puede listar, se devuelve solo el error original
      }
    }

    return new Response(
      JSON.stringify({ ok: false, error: String(err), candidatas }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  } finally {
    await sql.end();
  }
});
