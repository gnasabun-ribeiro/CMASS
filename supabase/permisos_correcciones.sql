-- Correcciones de permisos que salieron de la prueba de QA (octubre 2026).
-- Hoy todos los usuarios son administradores y su policy los deja hacer todo, por eso
-- nada de esto se notaba; aparece apenas haya inspectores, supervisores o 'lectura'.
--   1) Un inspector o supervisor no podía enviar su inspección (la base lo rechazaba).
--   2) Cualquier rol que inspecciona podía cambiar título, severidad o inspección de
--      cualquier hallazgo (solo tenía que poder cerrarlo / reabrirlo).
--   3) El administrador no podía registrar los destinatarios del informe al enviar la
--      inspección de otra persona.
--   4) Cada usuario podía cambiarse el propio nombre.
--   5) Un usuario dado de baja, o pasado a 'lectura', seguía escribiendo en sus inspecciones.
--   6) Avisos de seguridad de Supabase (Advisors).
-- Repetible: se puede volver a ejecutar sin romper nada.
-- Requiere roles_y_permisos.sql e informes_destinatarios.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

-- 1) Enviar la inspección propia ----------------------------------------------------------
-- La policy de update del dueño no tenía WITH CHECK, y en ese caso Postgres le exige a la
-- fila ya modificada lo mismo que a la original (estado = 'borrador'): pasar a 'enviado'
-- fallaba con "new row violates row-level security policy".

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('inspecciones_obra', 'Los inspectores actualizan sus propias inspecciones de obra'),
      ('inspecciones',      'Los inspectores actualizan sus propias inspecciones')
    ) as v(cab, p_update)
  loop
    execute format('drop policy if exists %I on public.%I', c.p_update, c.cab);
    execute format(
      'create policy %I on public.%I for update
         using (auth.uid() = inspector_id and estado = ''borrador'' and public.puede_inspeccionar())
         with check (auth.uid() = inspector_id and estado in (''borrador'', ''enviado'') and public.puede_inspeccionar())',
      c.p_update, c.cab);
  end loop;
end $$;

-- 2) Hallazgos: fuera del administrador, solo se toca el seguimiento ------------------------
-- "Quien inspecciona gestiona el seguimiento de hallazgos" deja hacer update sobre cualquier
-- hallazgo, y una policy no puede limitar columnas: eso lo hace este trigger. La app nunca
-- edita los datos de un hallazgo (se borra y se vuelve a cargar), así que nadie más que el
-- administrador los cambia, tampoco el dueño. Quién lo cerró sale de la sesión, no de lo
-- que mande la app. auth.uid() es null en el SQL Editor y en las Edge Functions: ahí se puede.

create or replace function public.proteger_datos_hallazgo()
returns trigger
language plpgsql set search_path = public
as $$
declare
  seguimiento constant text[] := array['estado', 'cerrado_at', 'cerrado_por', 'nota_cierre'];
begin
  if auth.uid() is null or public.es_admin() then
    return new;
  end if;
  if (to_jsonb(new) - seguimiento) is distinct from (to_jsonb(old) - seguimiento) then
    raise exception 'Solo un administrador puede modificar los datos de un hallazgo'
      using errcode = '42501';
  end if;
  if new.estado is distinct from old.estado or new.cerrado_por is distinct from old.cerrado_por then
    new.cerrado_por := case when new.estado = 'cerrado' then auth.uid() end;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_datos_hallazgo on public.inspecciones_obra_hallazgos;
create trigger proteger_datos_hallazgo
  before update on public.inspecciones_obra_hallazgos
  for each row execute procedure public.proteger_datos_hallazgo();

drop trigger if exists proteger_datos_hallazgo on public.inspecciones_hallazgos;
create trigger proteger_datos_hallazgo
  before update on public.inspecciones_hallazgos
  for each row execute procedure public.proteger_datos_hallazgo();

revoke execute on function public.proteger_datos_hallazgo() from public, anon, authenticated;

-- 3) Destinatarios del informe: también los registra el administrador ---------------------
-- Al enviar la inspección de otra persona (el administrador puede), sync.js registra los
-- destinatarios y la policy solo aceptaba al dueño: la sincronización quedaba trabada.
-- sync.js usa upsert (on conflict ... do nothing), y para eso Postgres también exige
-- poder leer la fila: por eso el administrador necesita además la policy de select.

drop policy if exists "El administrador ve todos los envios" on public.informes_envios;
create policy "El administrador ve todos los envios"
  on public.informes_envios for select
  using (public.es_admin());

drop policy if exists "Los inspectores registran los envios de sus inspecciones" on public.informes_envios;
create policy "Los inspectores registran los envios de sus inspecciones"
  on public.informes_envios for insert
  with check (
    estado = 'pendiente'
    and (
      public.es_admin()
      or (
        public.puede_inspeccionar()
        and (
          exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid())
          or exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid())
        )
      )
    )
  );

-- 4) El perfil propio ya no se edita ------------------------------------------------------
-- La policy vieja de profiles.sql dejaba a cada uno cambiarse el nombre (y así aparecer con
-- otro en el panel). La app no la usa: el nombre lo pone el alta y lo cambia el administrador.

drop policy if exists "Los usuarios actualizan su propio perfil" on public.profiles;

-- 5) Dados de baja y 'lectura' no escriben en sus inspecciones -----------------------------
-- Las policies viejas del dueño (cargar / actualizar / borrar en checklist, hallazgos, firmas,
-- fotos y sus archivos) solo miraban auth.uid() = inspector_id. Se les suma
-- puede_inspeccionar(), que es falso para 'lectura' y para los dados de baja. Las que ya lo
-- tienen se saltean.

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where cmd in ('INSERT', 'UPDATE', 'DELETE')
      and policyname like 'Los inspectores %'
      and (
        (schemaname = 'public' and tablename in (
          'inspecciones_obra_checklist', 'inspecciones_obra_hallazgos', 'inspecciones_obra_firmas', 'inspecciones_obra_fotos',
          'inspecciones_checklist',      'inspecciones_hallazgos',      'inspecciones_firmas',      'inspecciones_fotos'))
        or (schemaname = 'storage' and tablename = 'objects')
      )
      and coalesce(qual, '') || coalesce(with_check, '') not like '%puede_inspeccionar%'
  loop
    if p.qual is not null then
      execute format('alter policy %I on %I.%I using ((%s) and public.puede_inspeccionar())',
        p.policyname, p.schemaname, p.tablename, p.qual);
    end if;
    if p.with_check is not null then
      execute format('alter policy %I on %I.%I with check ((%s) and public.puede_inspeccionar())',
        p.policyname, p.schemaname, p.tablename, p.with_check);
    end if;
  end loop;
end $$;

-- 6) Avisos de seguridad (Dashboard > Advisors) -------------------------------------------
-- handle_new_user() la dispara el alta en auth.users; no tiene que poder llamarse por la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Solo usa now(): con search_path vacío no se le puede colar una función de otro esquema.
alter function public.handle_inspeccion_obra_updated_at() set search_path = '';
-- Quedan a propósito:
--  * mi_rol(), es_admin(), puede_inspeccionar() y es_usuario_activo() los puede llamar
--    'authenticated' porque las policies corren con ese rol; solo dicen el rol propio.
--  * pg_net en el esquema public: no se puede mover sin desinstalarlo y reinstalarlo, y lo
--    usa el cron de centros_de_costos. Riesgo bajo.
--  * "Leaked password protection" no es SQL: se activa en Dashboard > Authentication
--    (requiere un plan pago).
