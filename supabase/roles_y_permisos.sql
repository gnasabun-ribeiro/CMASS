-- Roles y permisos + seguimiento de hallazgos (panel de administración).
-- Roles: administrador | supervisor | inspector | lectura. Un usuario tiene uno solo
-- (columna profiles.rol) y se puede dar de baja con profiles.activo = false.
--
-- Reglas (salen del relevamiento con los usuarios):
--   * Todos los roles activos VEN todas las inspecciones, de cualquier inspector y obra.
--   * Crean inspecciones: inspector, supervisor, administrador. 'lectura' no crea nada.
--   * Una inspección ya enviada solo la edita / borra el administrador.
--   * Asignar y cerrar hallazgos: inspector, supervisor, administrador.
--   * Gestionar usuarios (rol / baja): solo administrador.
-- Las policies nuevas se SUMAN a las que ya existen (las de "el inspector ve y edita lo
-- suyo" siguen valiendo); solo se reemplazan las de insert/update de la cabecera, para que
-- 'lectura' no cree nada y un inspector no pueda tocar una inspección ya enviada.
-- Las tablas hijas (checklist, hallazgos, firmas, fotos) siguen dejando escribir al
-- inspector dueño aunque la inspección esté enviada: sync.js repite esas escrituras
-- cuando se corta la conexión justo después de enviar, y bloquearlas rompería el reintento.
-- La pantalla ya no deja editar una inspección enviada si no sos administrador.
--
-- Requiere todos los .sql anteriores (profiles, inspecciones_obra*, inspecciones_generico,
-- fotos_inspeccion, inspecciones_obra_firmas).
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.
-- DESPUÉS de ejecutarlo hay que nombrar al primer administrador (ver el final del archivo),
-- si no nadie va a poder cambiar roles.

-- 1) Rol y baja en el perfil --------------------------------------------------------

alter table public.profiles
  add column if not exists rol text not null default 'inspector'
    check (rol in ('administrador', 'supervisor', 'inspector', 'lectura')),
  add column if not exists activo boolean not null default true;

-- 2) Funciones auxiliares (security definer: leen profiles sin depender de sus policies) --

create or replace function public.mi_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select rol from public.profiles where id = auth.uid() and activo
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mi_rol() = 'administrador', false)
$$;

-- Quien puede cargar inspecciones y gestionar hallazgos.
create or replace function public.puede_inspeccionar()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.mi_rol() in ('administrador', 'supervisor', 'inspector'), false)
$$;

-- Cualquier usuario activo (los 4 roles).
create or replace function public.es_usuario_activo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.mi_rol() is not null
$$;

-- 3) profiles: todos ven los nombres; solo el administrador cambia rol / baja ------------

drop policy if exists "Los usuarios activos ven todos los perfiles" on public.profiles;
create policy "Los usuarios activos ven todos los perfiles"
  on public.profiles for select
  using (public.es_usuario_activo());

drop policy if exists "El administrador actualiza cualquier perfil" on public.profiles;
create policy "El administrador actualiza cualquier perfil"
  on public.profiles for update
  using (public.es_admin());

-- La policy vieja deja a cada uno actualizar su perfil: sin este trigger podría
-- ascenderse a administrador. auth.uid() es null en el SQL Editor, así que ahí se puede.
create or replace function public.proteger_rol_y_baja()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.rol is distinct from old.rol or new.activo is distinct from old.activo)
     and auth.uid() is not null
     and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar el rol o dar de baja usuarios';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_rol_y_baja on public.profiles;
create trigger proteger_rol_y_baja
  before update on public.profiles
  for each row execute procedure public.proteger_rol_y_baja();

-- 4) Seguimiento de hallazgos: abierto / cerrado -----------------------------------------

alter table public.inspecciones_obra_hallazgos
  add column if not exists estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  add column if not exists cerrado_at timestamptz,
  add column if not exists cerrado_por uuid references public.profiles (id) on delete set null,
  add column if not exists nota_cierre text;

alter table public.inspecciones_hallazgos
  add column if not exists estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  add column if not exists cerrado_at timestamptz,
  add column if not exists cerrado_por uuid references public.profiles (id) on delete set null,
  add column if not exists nota_cierre text;

create index if not exists inspecciones_obra_hallazgos_estado_idx on public.inspecciones_obra_hallazgos (estado);
create index if not exists inspecciones_hallazgos_estado_idx on public.inspecciones_hallazgos (estado);

-- 5) Inspecciones y tablas hijas ----------------------------------------------------------

do $$
declare
  c record;
  tabla text;
begin
  -- (cabecera, nombre de la policy de insert vieja, nombre de la de update vieja)
  for c in
    select * from (values
      ('inspecciones_obra', 'Los inspectores crean sus propias inspecciones de obra', 'Los inspectores actualizan sus propias inspecciones de obra'),
      ('inspecciones',      'Los inspectores crean sus propias inspecciones',          'Los inspectores actualizan sus propias inspecciones')
    ) as v(cab, p_insert, p_update)
  loop
    execute format('drop policy if exists "Los usuarios activos ven todas las inspecciones" on public.%I', c.cab);
    execute format('create policy "Los usuarios activos ven todas las inspecciones" on public.%I for select using (public.es_usuario_activo())', c.cab);

    execute format('drop policy if exists "El administrador gestiona todas las inspecciones" on public.%I', c.cab);
    execute format('create policy "El administrador gestiona todas las inspecciones" on public.%I for all using (public.es_admin()) with check (public.es_admin())', c.cab);

    -- Crear: solo roles que inspeccionan ('lectura' queda afuera).
    execute format('drop policy if exists %I on public.%I', c.p_insert, c.cab);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = inspector_id and public.puede_inspeccionar())', c.p_insert, c.cab);

    -- Actualizar lo propio: solo mientras es borrador (enviar es un update sobre un borrador).
    execute format('drop policy if exists %I on public.%I', c.p_update, c.cab);
    execute format('create policy %I on public.%I for update using (auth.uid() = inspector_id and estado = ''borrador'' and public.puede_inspeccionar())', c.p_update, c.cab);
  end loop;

  -- Tablas hijas: todos los activos leen; el administrador hace todo.
  foreach tabla in array array[
    'inspecciones_obra_checklist', 'inspecciones_obra_hallazgos', 'inspecciones_obra_firmas', 'inspecciones_obra_fotos',
    'inspecciones_checklist',      'inspecciones_hallazgos',      'inspecciones_firmas',      'inspecciones_fotos'
  ] loop
    execute format('drop policy if exists "Los usuarios activos ven todo" on public.%I', tabla);
    execute format('create policy "Los usuarios activos ven todo" on public.%I for select using (public.es_usuario_activo())', tabla);
    execute format('drop policy if exists "El administrador gestiona todo" on public.%I', tabla);
    execute format('create policy "El administrador gestiona todo" on public.%I for all using (public.es_admin()) with check (public.es_admin())', tabla);
  end loop;

  -- Hallazgos: cerrar / reabrir (update) lo puede hacer cualquier rol que inspecciona,
  -- sobre los hallazgos de cualquier inspección.
  foreach tabla in array array['inspecciones_obra_hallazgos', 'inspecciones_hallazgos'] loop
    execute format('drop policy if exists "Quien inspecciona gestiona el seguimiento de hallazgos" on public.%I', tabla);
    execute format('create policy "Quien inspecciona gestiona el seguimiento de hallazgos" on public.%I for update using (public.puede_inspeccionar()) with check (public.puede_inspeccionar())', tabla);
  end loop;
end $$;

-- 6) Storage: todos los activos ven fotos y firmas; el administrador gestiona todo -------

drop policy if exists "Los usuarios activos ven las fotos y firmas" on storage.objects;
create policy "Los usuarios activos ven las fotos y firmas"
  on storage.objects for select to authenticated
  using (bucket_id in ('checklist-fotos', 'fotos-inspeccion') and public.es_usuario_activo());

drop policy if exists "El administrador gestiona fotos y firmas" on storage.objects;
create policy "El administrador gestiona fotos y firmas"
  on storage.objects for all to authenticated
  using (bucket_id in ('checklist-fotos', 'fotos-inspeccion') and public.es_admin())
  with check (bucket_id in ('checklist-fotos', 'fotos-inspeccion') and public.es_admin());

-- 7) Las funciones auxiliares no deben poder llamarse sin sesión (las usan las policies,
-- que corren como 'authenticated'); el trigger no se llama a mano.
revoke execute on function public.proteger_rol_y_baja() from public, anon, authenticated;
revoke execute on function public.mi_rol() from public, anon;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.puede_inspeccionar() from public, anon;
revoke execute on function public.es_usuario_activo() from public, anon;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.puede_inspeccionar() to authenticated;
grant execute on function public.es_usuario_activo() to authenticated;

-- 8) PRIMER ADMINISTRADOR ------------------------------------------------------------------
-- Cambiá el correo si hace falta y ejecutá esta línea (auth.uid() es null en el SQL Editor,
-- así que el trigger de arriba lo permite). Después el panel permite nombrar a los demás.
update public.profiles set rol = 'administrador' where email = 'geraldine.nasabun@ribeirosrl.com.ar';
