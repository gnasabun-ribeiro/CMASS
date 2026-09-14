// Sincroniza RIBEIRO_BD_CENTROS_DE_COSTOS (DW de Finnegans, Postgres) hacia
// public.centros_de_costos en Supabase. Pensada para invocarse por HTTP desde
// el cron job de supabase/centros_de_costos.sql, o a mano para probar.
//
// Deploy sin CLI: Dashboard > Edge Functions > New function > pegar este
// archivo entero.
//
// Secrets necesarios (Dashboard > Edge Functions > DW_FINNEGANS > Manage
// secrets), uno por uno — ver supabase/functions/DW_FINNEGANS/secrets.example.env:
// DW_HOST, DW_PORT, DW_DATABASE, DW_USER, DW_PASSWORD, SYNC_SECRET.
// DW_SCHEMA es opcional (default "public").
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo, no hace
// falta cargarlos a mano.
//
// La tabla destino guarda cada fila del DW como jsonb en `data`: todavía no
// conocemos la estructura real de RIBEIRO_BD_CENTROS_DE_COSTOS, así que esto
// evita tener que adivinar columnas. Una vez que se vea la forma de los datos
// se puede migrar a columnas tipadas si hace falta.

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

  const sql = postgres({
    host: Deno.env.get("DW_HOST"),
    port: Number(Deno.env.get("DW_PORT") ?? "5432"),
    database: Deno.env.get("DW_DATABASE"),
    username: Deno.env.get("DW_USER"),
    password: Deno.env.get("DW_PASSWORD"),
    ssl: "require",
    // Si el DW no acepta conexiones desde acá (firewall/VPN), sin esto la
    // función se queda colgada sin responder hasta que la plataforma la mata.
    // Con esto, falla rápido y devuelve un error explícito.
    connect_timeout: 10,
  });

  const esquema = Deno.env.get("DW_SCHEMA") || "public";

  try {
    const filas = await sql`
      select * from ${sql(esquema)}."RIBEIRO_BD_CENTROS_DE_COSTOS"
    `;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Repuebla entera: se borra todo y se insertan las filas que vinieron
    // ahora del DW. No hay upsert incremental porque no sabemos todavía cuál
    // es la clave natural de la tabla origen.
    const { error: deleteError } = await supabase
      .from("centros_de_costos")
      .delete()
      .gte("id", 0);
    if (deleteError) throw deleteError;

    if (filas.length > 0) {
      const { error: insertError } = await supabase
        .from("centros_de_costos")
        .insert(filas.map((fila) => ({ data: fila })));
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ ok: true, filas: filas.length }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  } finally {
    await sql.end();
  }
});
