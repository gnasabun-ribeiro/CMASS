-- Une nombre y apellido de public.colaboradores en una sola columna "nombre_completo"
-- ("Nombre Apellido"), sacada de data->>'nombrecompleto' (el DW lo trae como
-- "APELLIDO, NOMBRE" en mayúsculas). Después elimina las columnas nombre y apellido,
-- que quedaron vacías. Correr ANTES de volver a desplegar DW_COLABORADORES (la versión
-- nueva de la función ya escribe nombre_completo). Es repetible.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

alter table public.colaboradores add column if not exists nombre_completo text;

with x as (select id, data->>'nombrecompleto' as n from public.colaboradores)
update public.colaboradores c set
  nombre_completo = nullif(trim(initcap(lower(
    case when position(',' in x.n) > 0
         then trim(substr(x.n, position(',' in x.n) + 1)) || ' ' || trim(split_part(x.n, ',', 1))
         else trim(x.n) end
  ))), '')
from x where x.id = c.id and x.n is not null;

alter table public.colaboradores drop column if exists nombre;
alter table public.colaboradores drop column if exists apellido;
