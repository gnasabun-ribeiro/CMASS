-- Alta de usuarios desde la app (Panel > Usuarios > Agregar usuario).
-- La persona se busca en public.colaboradores; si no tiene correo corporativo se le
-- asigna uno al darla de alta. Como esa tabla se borra y se vuelve a cargar entera en cada
-- sincronización con el DW (Edge Function DW_COLABORADORES), un correo puesto a mano se
-- perdería: se guarda además acá, con la clave estable <base>|<numerolegajo> del DW, y un
-- trigger lo vuelve a poner cada vez que la fila de la persona se vuelve a insertar
-- (solo si el DW no trae correo corporativo propio).
-- Las altas las hace la Edge Function admin-usuarios (service role), que verifica que quien
-- llama sea administrador. Desde el cliente esta tabla solo la lee un administrador.
-- Requiere roles_y_permisos.sql (es_admin()) y colaboradores.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.colaboradores_correos (
  clave text primary key, -- '<base>|<numerolegajo>'
  correo text not null check (lower(correo) like '%@ribeirosrl.com.ar'),
  asignado_por uuid references public.profiles (id) on delete set null,
  asignado_at timestamptz not null default now()
);

comment on table public.colaboradores_correos is
  'Correos corporativos asignados a mano a colaboradores que el DW trae sin correo. '
  'Se reaplican a public.colaboradores en cada sincronización (trigger).';

alter table public.colaboradores_correos enable row level security;

drop policy if exists "El administrador ve los correos asignados" on public.colaboradores_correos;
create policy "El administrador ve los correos asignados"
  on public.colaboradores_correos for select
  using (public.es_admin());

create or replace function public.aplicar_correo_asignado()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(new.correo, '') = '' then
    select c.correo into new.correo
    from public.colaboradores_correos c
    where c.clave = (new.data->>'base') || '|' || (new.data->>'numerolegajo');
  end if;
  return new;
end;
$$;

revoke execute on function public.aplicar_correo_asignado() from public, anon, authenticated;

drop trigger if exists aplicar_correo_asignado on public.colaboradores;
create trigger aplicar_correo_asignado
  before insert on public.colaboradores
  for each row execute procedure public.aplicar_correo_asignado();
