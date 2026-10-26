-- Colaboradores cargados a mano: personas que no vienen en el DW de Finnegans
-- (public.colaboradores se borra y se repuebla entera cada día desde el DW, así que
-- lo que se agrega ahí se pierde). La app junta las dos tablas en el selector de
-- responsables (src/lib/colaboradores.js). Los correos de personas que SÍ están en el
-- DW no van acá: van en public.colaboradores_correos (ver usuarios_alta.sql).
-- Requiere roles_y_permisos.sql (es_admin()).
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query. Es repetible.

create table if not exists public.colaboradores_manuales (
  id bigint generated always as identity primary key,
  nombre_completo text not null check (btrim(nombre_completo) <> ''), -- "Nombre Apellido", como en colaboradores
  correo text check (correo is null or lower(correo) like '%@ribeirosrl.com.ar'),
  creado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists colaboradores_manuales_nombre_idx
  on public.colaboradores_manuales (lower(nombre_completo));

comment on table public.colaboradores_manuales is
  'Colaboradores que no están en el DW, cargados a mano. La sincronización con el DW '
  '(DW_COLABORADORES) no toca esta tabla.';

alter table public.colaboradores_manuales enable row level security;

-- Mismo criterio que public.colaboradores: lectura para cualquier usuario autenticado.
drop policy if exists "Los usuarios autenticados leen los colaboradores manuales" on public.colaboradores_manuales;
create policy "Los usuarios autenticados leen los colaboradores manuales"
  on public.colaboradores_manuales for select
  to authenticated
  using (true);

drop policy if exists "El administrador administra los colaboradores manuales" on public.colaboradores_manuales;
create policy "El administrador administra los colaboradores manuales"
  on public.colaboradores_manuales for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());
