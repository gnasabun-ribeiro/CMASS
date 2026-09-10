-- Inspecciones de Obra Pública: cabecera (Paso 1 · Generales) y respuestas del
-- checklist (Paso 2 · Checklist). Los ítems del checklist son fijos y viven en
-- el código (src/data/checklist.js); acá solo se guardan las respuestas.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.inspecciones_obra (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.profiles (id) on delete cascade,
  cliente text,
  ubicacion text,
  grupo_auditado text,
  fecha_hora timestamptz,
  tarea_observada text,
  estado text not null default 'borrador' check (estado in ('borrador', 'enviado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inspecciones_obra enable row level security;

create policy "Los inspectores ven sus propias inspecciones de obra"
  on public.inspecciones_obra for select
  using (auth.uid() = inspector_id);

create policy "Los inspectores crean sus propias inspecciones de obra"
  on public.inspecciones_obra for insert
  with check (auth.uid() = inspector_id);

create policy "Los inspectores actualizan sus propias inspecciones de obra"
  on public.inspecciones_obra for update
  using (auth.uid() = inspector_id);

-- Una fila por ítem respondido. `codigo`, `categoria` e `item` guardan una
-- copia del texto del checklist al momento de responder, para que el
-- historial no cambie si más adelante se edita la lista en el código.
create table if not exists public.inspecciones_obra_checklist (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones_obra (id) on delete cascade,
  codigo text not null,
  categoria text not null,
  item text not null,
  valor text not null check (valor in ('ok', 'no', 'na')),
  foto_url text,
  created_at timestamptz not null default now(),
  unique (inspeccion_id, codigo)
);

alter table public.inspecciones_obra_checklist enable row level security;

create policy "Los inspectores ven las respuestas de sus inspecciones"
  on public.inspecciones_obra_checklist for select
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores cargan respuestas en sus inspecciones"
  on public.inspecciones_obra_checklist for insert
  with check (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores actualizan respuestas de sus inspecciones"
  on public.inspecciones_obra_checklist for update
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

-- Mantiene `updated_at` al día en cada cambio de la cabecera.
create or replace function public.handle_inspeccion_obra_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_inspeccion_obra_updated on public.inspecciones_obra;
create trigger on_inspeccion_obra_updated
  before update on public.inspecciones_obra
  for each row execute procedure public.handle_inspeccion_obra_updated_at();
