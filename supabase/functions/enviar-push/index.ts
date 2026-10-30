// Avisos del navegador con la app cerrada (Web Push).
// La llama la base (trigger `enviar_push` de supabase/notificaciones.sql, con pg_net) cada
// vez que se crea una notificación para un usuario que tiene algún dispositivo suscripto.
// Recibe { notificacion_id }, la lee con la service role key y la manda a todos los
// dispositivos de ese usuario (public.push_suscripciones). Las suscripciones vencidas
// (el navegador responde 404/410) se borran.
//
// Deploy: Dashboard > Edge Functions > New function > enviar-push, con "Verify JWT"
// DESACTIVADO (no la llama un usuario sino la base, con su propio secreto PUSH_SECRET).
// Secrets: ver secrets.example.env de esta carpeta. SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return responder(405, { ok: false, error: "método no permitido" });

  const secreto = Deno.env.get("PUSH_SECRET");
  if (!secreto || req.headers.get("Authorization") !== `Bearer ${secreto}`) return responder(401, { ok: false, error: "no autorizado" });

  try {
    const { notificacion_id } = await req.json();
    if (!notificacion_id) return responder(400, { ok: false, error: "falta notificacion_id" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: n, error } = await supabase
      .from("notificaciones")
      .select("id, usuario_id, tipo, titulo, descripcion, ruta")
      .eq("id", notificacion_id)
      .maybeSingle();
    if (error) throw error;
    if (!n) return responder(404, { ok: false, error: "no existe la notificación" });

    const { data: suscripciones, error: errorSus } = await supabase
      .from("push_suscripciones")
      .select("endpoint, p256dh, auth")
      .eq("usuario_id", n.usuario_id);
    if (errorSus) throw errorSus;

    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
    // Lo que lee public/push-sw.js para mostrar el aviso.
    const contenido = JSON.stringify({ id: n.id, tipo: n.tipo, titulo: n.titulo, descripcion: n.descripcion, ruta: n.ruta });

    let enviadas = 0;
    for (const s of suscripciones ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, contenido, { TTL: 60 * 60 * 24 });
        enviadas++;
      } catch (err) {
        const estado = (err as { statusCode?: number }).statusCode;
        if (estado === 404 || estado === 410) await supabase.from("push_suscripciones").delete().eq("endpoint", s.endpoint);
        else console.error("push", estado, (err as Error).message);
      }
    }
    return responder(200, { ok: true, enviadas });
  } catch (err) {
    console.error(err);
    return responder(500, { ok: false, error: (err as Error).message });
  }
});
