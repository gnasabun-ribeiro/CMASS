-- Inspecciones de Obra Pública: firmas del cierre (Paso 4).
-- Una fila por rol ('inspector' / 'responsable'). La imagen (PNG) vive en el
-- bucket privado `checklist-fotos`, en <inspeccion_id>/firmas/<rol>-<timestamp>.png,
-- y acá se guarda su ruta junto con el nombre del firmante.
-- Requiere inspecciones_obra.sql y storage_checklist_fotos.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.inspecciones_obra_firmas (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones_obra (id) on delete cascade,
  rol text not null check (rol in ('inspector', 'responsable')),
  nombre text,
  ruta text not null,
  created_at timestamptz not null default now(),
  unique (inspeccion_id, rol)
);

alter table public.inspecciones_obra_firmas enable row level security;

create policy "Los inspectores ven las firmas de sus inspecciones"
  on public.inspecciones_obra_firmas for select
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores cargan firmas en sus inspecciones"
  on public.inspecciones_obra_firmas for insert
  with check (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores actualizan firmas de sus inspecciones"
  on public.inspecciones_obra_firmas for update
  using (
    exists (
      select 1 from public.inspecciones_obra i
      where i.id = inspeccion_id and i.inspector_id = auth.uid()
    )
  );
