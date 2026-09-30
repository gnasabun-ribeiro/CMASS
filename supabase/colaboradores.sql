-- Tabla auxiliar "colaboradores": espejo de RIBEIRO_GENERALES_COLABORADORES
-- (nombre, apellido, correo, ...), que vive en el Data Warehouse de Finnegans.
-- La conexión al DW la hace la Edge Function DW_COLABORADORES (Deno); usa los
-- mismos secrets que DW_FINNEGANS, no hay que cargar nada nuevo.
-- Ver supabase/functions/DW_COLABORADORES/index.ts.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.
-- Requiere haber corrido antes supabase/centros_de_costos.sql (extensiones
-- pg_cron y pg_net).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada fila es un registro del DW tal cual, en jsonb. Cuando se confirmen los
-- nombres de columna (la función los devuelve en `columnas`), se puede agregar
-- una vista sobre `data` con nombre / apellido / correo.
drop table if exists public.colaboradores;
create table public.colaboradores (
  id bigint generated always as identity primary key,
  nombre text,
  apellido text,
  correo text,
  data jsonb not null,
  synced_at timestamptz not null default now()
);

comment on table public.colaboradores is
  'Espejo de RIBEIRO_GENERALES_COLABORADORES (DW Finnegans), repoblado entero '
  'en cada corrida de la Edge Function DW_COLABORADORES. No editar a mano.';

alter table public.colaboradores enable row level security;

-- Contiene datos personales (correo): solo lectura para usuarios autenticados.
create policy "Los usuarios autenticados leen los colaboradores"
  on public.colaboradores for select
  to authenticated
  using (true);

-- Cron diario a las 5:10 UTC. Completá <PROJECT_REF> y <SYNC_SECRET> acá mismo
-- en el SQL Editor (no en este archivo).
select cron.schedule(
  'sync_colaboradores',
  '10 5 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/DW_COLABORADORES',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SYNC_SECRET>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Para probar a mano (mismos reemplazos):
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/DW_COLABORADORES',
--     headers := jsonb_build_object('Authorization', 'Bearer <SYNC_SECRET>')
--   );
