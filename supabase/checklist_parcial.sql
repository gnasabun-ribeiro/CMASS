-- Checklist: nueva respuesta 'parcial' ("Cumple parcialmente") y comentario por ítem.
-- El comentario es obligatorio cuando la respuesta es 'parcial', pero eso lo exige la
-- pantalla al cerrar la inspección, no la base: la respuesta se guarda apenas se toca el
-- botón y el comentario llega después (y sin conexión pueden subir en momentos distintos).
-- Aplica a las dos tablas de respuestas (obra y genérica). Es compatible con la versión
-- anterior de la app: no cambia ni borra nada de lo que ya hay.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

alter table public.inspecciones_obra_checklist
  drop constraint if exists inspecciones_obra_checklist_valor_check,
  add constraint inspecciones_obra_checklist_valor_check check (valor in ('ok', 'parcial', 'no', 'na')),
  add column if not exists comentario text;

alter table public.inspecciones_checklist
  drop constraint if exists inspecciones_checklist_valor_check,
  add constraint inspecciones_checklist_valor_check check (valor in ('ok', 'parcial', 'no', 'na')),
  add column if not exists comentario text;
