-- Notificaciones del servidor (campana de la app) y avisos del navegador (push).
--
-- Qué avisa (lo crea la base sola, con triggers; nadie las inserta desde la app):
--   * Al ENVIAR una inspección:
--       - a cada responsable de un hallazgo que tenga usuario en la app (por su correo,
--         responsable_correo) → "Te asignaron un hallazgo";
--       - si hay hallazgos Críticos, a supervisores y administradores → "Hallazgo crítico".
--   * Al CERRAR un hallazgo otra persona → al inspector que lo cargó: "Se cerró un hallazgo".
--   * Todos los días a las 8 (Argentina), por los hallazgos abiertos de inspecciones enviadas:
--     al responsable (si tiene usuario) y al inspector → "Vence mañana" / "Venció ayer".
--   Nunca se avisa a quien hizo la acción.
--
-- Requiere: roles_y_permisos.sql, informes_destinatarios.sql (responsable_correo) y
-- permisos_correcciones.sql, y las extensiones pg_cron y pg_net (ya activas: las usa
-- centros_de_costos.sql). Ejecutar en Supabase: Dashboard > SQL Editor > New query.
-- YA EJECUTADO el 2026-10-30 (partes 1 a 6; el push queda inactivo hasta cargar los secretos
-- del final). Antes se probó en una transacción deshecha con inspecciones simuladas.
--
-- AVISOS DEL NAVEGADOR CON LA APP CERRADA (push), opcional — ver el final del archivo.

-- 1) Tabla ---------------------------------------------------------------------------------

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null default 'info' check (tipo in ('success', 'error', 'warning', 'info')),
  titulo text not null,
  descripcion text,
  ruta text, -- pantalla de la app a la que lleva al tocarla
  leida boolean not null default false,
  clave text, -- evita repetir el mismo aviso (ej. 'vence:<hallazgo>')
  created_at timestamptz not null default now(),
  unique (usuario_id, clave)
);

create index if not exists notificaciones_usuario_idx on public.notificaciones (usuario_id, created_at desc);

alter table public.notificaciones enable row level security;

-- (select auth.uid()): se calcula una vez por consulta y no por fila (aviso de Advisors).
drop policy if exists "Cada usuario ve sus notificaciones" on public.notificaciones;
create policy "Cada usuario ve sus notificaciones"
  on public.notificaciones for select using (usuario_id = (select auth.uid()));

drop policy if exists "Cada usuario marca sus notificaciones" on public.notificaciones;
create policy "Cada usuario marca sus notificaciones"
  on public.notificaciones for update using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

drop policy if exists "Cada usuario descarta sus notificaciones" on public.notificaciones;
create policy "Cada usuario descarta sus notificaciones"
  on public.notificaciones for delete using (usuario_id = (select auth.uid()));

-- Desde la app solo se puede cambiar "leida" (ni el texto ni el destinatario).
revoke insert, update on public.notificaciones from anon, authenticated;
grant update (leida) on public.notificaciones to authenticated;

-- Tiempo real: la campana se actualiza sola cuando llega una.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end;
$$;

-- 2) Funciones auxiliares ------------------------------------------------------------------

create or replace function public.notificar(
  p_usuario uuid, p_tipo text, p_titulo text, p_descripcion text, p_ruta text, p_clave text
)
returns void
language sql security definer set search_path = public
as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, descripcion, ruta, clave)
  select p_usuario, p_tipo, p_titulo, p_descripcion, p_ruta, p_clave
  where p_usuario is not null
    and exists (select 1 from public.profiles where id = p_usuario and activo)
  on conflict (usuario_id, clave) do nothing;
$$;

create or replace function public.usuario_por_correo(p_correo text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.profiles
  where p_correo is not null and lower(email) = lower(trim(p_correo)) and activo
  limit 1
$$;

-- Misma ruta que rutaFormulario() de src/data/modulos.js.
create or replace function public.ruta_inspeccion(p_modulo text, p_sub text, p_id uuid)
returns text
language sql immutable set search_path = public
as $$
  select case when p_sub is not null then '/modulos/' || p_modulo || '/form/' || p_sub
              else '/form/' || coalesce(p_modulo, 'obra') end
         || '?id=' || p_id
$$;

create or replace function public.texto_vence(p_vence date)
returns text
language sql immutable set search_path = public
as $$
  select case when p_vence is null then '' else ' · vence ' || to_char(p_vence, 'DD/MM/YYYY') end
$$;

-- 3) Al enviar una inspección --------------------------------------------------------------

create or replace function public.notificar_inspeccion_enviada()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  es_obra boolean;
  v_ruta text;
  v_cliente text;
  h record;
  destinatario uuid;
begin
  es_obra := tg_table_name = 'inspecciones_obra';
  v_ruta := public.ruta_inspeccion(
    case when es_obra then 'obra' else to_jsonb(new) ->> 'modulo_id' end,
    case when es_obra then null else to_jsonb(new) ->> 'sub_id' end,
    new.id
  );
  v_cliente := coalesce(nullif(trim(new.cliente), ''), 'Sin cliente');
  for h in execute format(
    'select id, titulo, severidad, vence, responsable_correo from public.%I where inspeccion_id = $1',
    case when es_obra then 'inspecciones_obra_hallazgos' else 'inspecciones_hallazgos' end
  ) using new.id
  loop
    destinatario := public.usuario_por_correo(h.responsable_correo);
    if destinatario is distinct from new.inspector_id then
      perform public.notificar(
        destinatario,
        case when h.severidad = 'Crítico' then 'error' else 'warning' end,
        'Te asignaron un hallazgo',
        h.titulo || ' · ' || v_cliente || public.texto_vence(h.vence),
        v_ruta,
        'asignado:' || h.id
      );
    end if;

    if h.severidad = 'Crítico' then
      perform public.notificar(p.id, 'error', 'Hallazgo crítico', h.titulo || ' · ' || v_cliente, v_ruta, 'critico:' || h.id)
      from public.profiles p
      where p.activo and p.rol in ('administrador', 'supervisor') and p.id <> new.inspector_id;
    end if;
  end loop;
  return new;
exception when others then
  return new; -- un aviso nunca impide enviar la inspección
end;
$$;

drop trigger if exists notificar_inspeccion_enviada on public.inspecciones_obra;
create trigger notificar_inspeccion_enviada
  after update of estado on public.inspecciones_obra
  for each row when (old.estado = 'borrador' and new.estado = 'enviado')
  execute procedure public.notificar_inspeccion_enviada();

drop trigger if exists notificar_inspeccion_enviada on public.inspecciones;
create trigger notificar_inspeccion_enviada
  after update of estado on public.inspecciones
  for each row when (old.estado = 'borrador' and new.estado = 'enviado')
  execute procedure public.notificar_inspeccion_enviada();

-- 4) Al cerrar un hallazgo ------------------------------------------------------------------

create or replace function public.notificar_hallazgo_cerrado()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  insp record;
begin
  if tg_table_name = 'inspecciones_obra_hallazgos' then
    select id, inspector_id, cliente, 'obra'::text as modulo_id, null::text as sub_id into insp
    from public.inspecciones_obra where id = new.inspeccion_id;
  else
    select id, inspector_id, cliente, modulo_id, sub_id into insp
    from public.inspecciones where id = new.inspeccion_id;
  end if;
  if insp.inspector_id is distinct from new.cerrado_por then
    perform public.notificar(
      insp.inspector_id,
      'success',
      'Se cerró un hallazgo de tu inspección',
      new.titulo || ' · ' || coalesce(nullif(trim(insp.cliente), ''), 'Sin cliente')
        || coalesce(' · ' || nullif(trim(new.nota_cierre), ''), ''),
      public.ruta_inspeccion(insp.modulo_id, insp.sub_id, insp.id),
      'cerrado:' || new.id || ':' || coalesce(new.cerrado_at::text, now()::text)
    );
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists notificar_hallazgo_cerrado on public.inspecciones_obra_hallazgos;
create trigger notificar_hallazgo_cerrado
  after update of estado on public.inspecciones_obra_hallazgos
  for each row when (old.estado = 'abierto' and new.estado = 'cerrado')
  execute procedure public.notificar_hallazgo_cerrado();

drop trigger if exists notificar_hallazgo_cerrado on public.inspecciones_hallazgos;
create trigger notificar_hallazgo_cerrado
  after update of estado on public.inspecciones_hallazgos
  for each row when (old.estado = 'abierto' and new.estado = 'cerrado')
  execute procedure public.notificar_hallazgo_cerrado();

-- 5) Vencimientos (todos los días) ----------------------------------------------------------

create or replace function public.notificar_vencimientos()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  h record;
  clave text;
begin
  for h in
    select hh.id, hh.titulo, hh.vence, hh.responsable_correo, i.id as inspeccion_id, i.inspector_id, i.cliente, 'obra'::text as modulo_id, null::text as sub_id
    from public.inspecciones_obra_hallazgos hh join public.inspecciones_obra i on i.id = hh.inspeccion_id
    where hh.estado = 'abierto' and i.estado = 'enviado' and hh.vence in (hoy + 1, hoy - 1)
    union all
    select hh.id, hh.titulo, hh.vence, hh.responsable_correo, i.id, i.inspector_id, i.cliente, i.modulo_id, i.sub_id
    from public.inspecciones_hallazgos hh join public.inspecciones i on i.id = hh.inspeccion_id
    where hh.estado = 'abierto' and i.estado = 'enviado' and hh.vence in (hoy + 1, hoy - 1)
  loop
    clave := case when h.vence > hoy then 'vence:' else 'vencido:' end || h.id;
    perform public.notificar(
      d.usuario,
      case when h.vence > hoy then 'warning' else 'error' end,
      case when h.vence > hoy then 'Un hallazgo vence mañana' else 'Un hallazgo venció ayer' end,
      h.titulo || ' · ' || coalesce(nullif(trim(h.cliente), ''), 'Sin cliente') || public.texto_vence(h.vence),
      public.ruta_inspeccion(h.modulo_id, h.sub_id, h.inspeccion_id),
      clave
    )
    from (select distinct u as usuario from unnest(array[public.usuario_por_correo(h.responsable_correo), h.inspector_id]) u) d;
  end loop;
end;
$$;

select cron.unschedule('notificar_vencimientos') where exists (select 1 from cron.job where jobname = 'notificar_vencimientos');
select cron.schedule('notificar_vencimientos', '0 11 * * *', 'select public.notificar_vencimientos()'); -- 11 UTC = 8 Argentina

revoke execute on function public.notificar(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notificar_inspeccion_enviada() from public, anon, authenticated;
revoke execute on function public.notificar_hallazgo_cerrado() from public, anon, authenticated;
revoke execute on function public.notificar_vencimientos() from public, anon, authenticated;
revoke execute on function public.usuario_por_correo(text) from public, anon, authenticated;

-- 6) Avisos del navegador con la app cerrada (push) -----------------------------------------
-- Cada dispositivo que activa "Avisos del navegador" en la campana guarda acá su
-- suscripción. Cuando se crea una notificación, la base llama a la Edge Function
-- `enviar-push` (supabase/functions/enviar-push), que la manda a esos dispositivos.

create table if not exists public.push_suscripciones (
  endpoint text primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_suscripciones_usuario_idx on public.push_suscripciones (usuario_id);

alter table public.push_suscripciones enable row level security;
-- Sin policies a propósito (Advisors lo marca como INFO): solo se usa con las dos funciones de
-- abajo y desde la Edge Function, con la service role key.
comment on table public.push_suscripciones is 'Dispositivos suscriptos a avisos push. Sin policies a propósito: se usa con registrar_push/quitar_push (security definer) y desde la Edge Function enviar-push (service role).';

-- El dispositivo queda a nombre de quien está logueado (si antes era de otra persona, cambia).
create or replace function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql security definer set search_path = public
as $$
  insert into public.push_suscripciones (endpoint, usuario_id, p256dh, auth)
  select p_endpoint, auth.uid(), p_p256dh, p_auth
  where auth.uid() is not null and public.es_usuario_activo()
  on conflict (endpoint) do update set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth;
$$;

create or replace function public.quitar_push(p_endpoint text)
returns void
language sql security definer set search_path = public
as $$
  delete from public.push_suscripciones where endpoint = p_endpoint and usuario_id = auth.uid();
$$;

revoke execute on function public.registrar_push(text, text, text) from public, anon;
revoke execute on function public.quitar_push(text) from public, anon;
grant execute on function public.registrar_push(text, text, text) to authenticated;
grant execute on function public.quitar_push(text) to authenticated;

-- Llama a la Edge Function. Usa dos secretos del Vault (no van en este archivo); si
-- todavía no están, no hace nada y la notificación igual queda en la campana.
create or replace function public.enviar_push()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_url text;
  v_secreto text;
begin
  if not exists (select 1 from public.push_suscripciones where usuario_id = new.usuario_id) then
    return new;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secreto is null then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secreto, 'Content-Type', 'application/json'),
    body := jsonb_build_object('notificacion_id', new.id)
  );
  return new;
exception when others then
  return new; -- el push nunca impide que la notificación quede guardada
end;
$$;

drop trigger if exists enviar_push on public.notificaciones;
create trigger enviar_push
  after insert on public.notificaciones
  for each row execute procedure public.enviar_push();

revoke execute on function public.enviar_push() from public, anon, authenticated;

-- Para activar el push (una sola vez):
--   1. Generar las claves VAPID en una terminal:  npx web-push generate-vapid-keys
--   2. Edge Function: Dashboard > Edge Functions > New function > enviar-push, pegar
--      supabase/functions/enviar-push/index.ts, con "Verify JWT" DESACTIVADO (la llama la
--      base con su propio secreto). Cargar sus secrets (ver secrets.example.env de esa carpeta).
--   3. En el .env de la app: VITE_VAPID_PUBLIC_KEY=<la clave pública del paso 1>, y volver a
--      hacer el build.
--   4. Acá en el SQL Editor (completar ACÁ MISMO, no guardar los valores en este archivo):
--        select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/enviar-push', 'push_url');
--        select vault.create_secret('<PUSH_SECRET, el mismo del paso 2>', 'push_secret');
--
-- Para probar sin esperar: con tu usuario en Supabase (Authentication > Users > tu id):
--   select public.notificar('<tu id>', 'info', 'Prueba', 'Aviso de prueba', '/', null);
