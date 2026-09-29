-- Inspecciones de Obra Pública: hallazgos (Paso 3 · Hallazgos).
-- Requiere haber ejecutado antes supabase/inspecciones_obra.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.inspecciones_obra_hallazgos (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones_obra (id) on delete cascade,
  titulo text not null,
  severidad text not null default 'Medio' check (severidad in ('Crítico', 'Medio', 'Bajo')),
  detalle text,
  responsable text,
  vence date,
  created_at timestamptz not null default now()
);

create index if not exists inspecciones_obra_hallazgos_inspeccion_idx
  on public.inspecciones_obra_hallazgos (inspeccion_id);

alter table public.inspecciones_obra_hallazgos enable row level security;

create policy "Los inspectores ven los hallazgos de sus inspecciones"
  on public.inspecciones_obra_hallazgos for select
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores cargan hallazgos en sus inspecciones"
  on public.inspecciones_obra_hallazgos for insert
  with check (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores borran hallazgos de sus inspecciones"
  on public.inspecciones_obra_hallazgos for delete
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );
