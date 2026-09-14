-- Tabla auxiliar "centros_de_costos": espejo de RIBEIRO_BD_CENTROS_DE_COSTOS,
-- que vive en el Data Warehouse de Finnegans (ribeiro.dw.finneg.com, Postgres).
-- La conexión al DW la hace la Edge Function DW_FINNEGANS (Deno), no Postgres
-- directamente — así las credenciales del DW quedan como secrets de Supabase
-- y nunca pasan por un archivo que se commitea. Este .sql solo crea la tabla
-- local y programa el cron que invoca la función por HTTP.
-- Ver supabase/functions/DW_FINNEGANS/index.ts para la función y
-- supabase/functions/DW_FINNEGANS/secrets.example.json para los secrets que
-- hay que cargar (a mano, en Dashboard > Edge Functions > Manage secrets —
-- no acá).
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

-- 1. Extensiones necesarias para que un cron job llame a una URL por HTTP.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Tabla local: cada fila es un registro de RIBEIRO_BD_CENTROS_DE_COSTOS tal
--    cual vino del DW, guardado en jsonb. Todavía no conocemos la estructura
--    real de esa tabla — cuando se vea la forma de los datos se puede migrar
--    a columnas tipadas si hace falta (ej. una vista sobre `data` primero, y
--    recién después una tabla con columnas propias si conviene).
drop table if exists public.centros_de_costos;
create table public.centros_de_costos (
  id bigint generated always as identity primary key,
  data jsonb not null,
  synced_at timestamptz not null default now()
);

comment on table public.centros_de_costos is
  'Espejo de RIBEIRO_BD_CENTROS_DE_COSTOS (DW Finnegans), repoblado entero en '
  'cada corrida de la Edge Function DW_FINNEGANS. No editar filas a mano, se '
  'pierden en el próximo sync.';

alter table public.centros_de_costos enable row level security;

create policy "Los usuarios autenticados leen los centros de costos"
  on public.centros_de_costos for select
  to authenticated
  using (true);

-- Nadie inserta/edita/borra desde el cliente: la tabla se repuebla solo desde
-- la Edge Function, que usa la service role key (no pasa por RLS).

-- 3. Programar la Edge Function para que corra sola todos los días a las 5am
--    UTC (cambiá el cron si hace falta otra frecuencia).
--
--    Completá ACÁ MISMO en el SQL Editor (no los guardes en este archivo):
--      <PROJECT_REF>  → lo ves en la URL del dashboard de tu proyecto
--      <SYNC_SECRET>  → el mismo valor que cargaste como secret SYNC_SECRET
--                       en la Edge Function
select cron.schedule(
  'sync_centros_de_costos',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/DW_FINNEGANS',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SYNC_SECRET>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Para probar la función a mano antes de esperar al cron, corré esto (con los
-- mismos reemplazos que arriba):
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/DW_FINNEGANS',
--     headers := jsonb_build_object('Authorization', 'Bearer <SYNC_SECRET>')
--   );

-- Para revisar corridas pasadas del cron:
--   select * from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'sync_centros_de_costos')
--   order by start_time desc;
