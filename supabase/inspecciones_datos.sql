-- Campos propios de un módulo en la cabecera de las inspecciones genéricas. Hoy los usa
-- la Tarjeta TOP (dorso de la tarjeta impresa): `observador` (apellido y nombre de quien
-- la completa), `funcion`, `accionInmediata` y `accionReiteracion`. El detalle de la
-- observación va en `tarea_observada` y el área de trabajo en `ubicacion`.
-- La app manda `datos` solo en los módulos que lo usan: los demás no dependen de esta
-- columna. Sin ella, las tarjetas TOP quedan en el dispositivo sin poder subirse.
-- No cambia ni borra nada de lo que ya hay; las policies existentes ya cubren la columna.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

alter table public.inspecciones
  add column if not exists datos jsonb not null default '{}'::jsonb;
