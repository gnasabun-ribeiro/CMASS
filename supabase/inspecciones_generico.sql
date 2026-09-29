-- Inspecciones de TODOS los módulos salvo Obra Pública (que tiene sus propias
-- tablas `inspecciones_obra*`): Servicios Petroleros, Simulacro, Visita Gerencial,
-- Tarjetas TOP, Reglas de Oro (cada regla es un `sub_id`) y Gestión Ambiental.
-- Misma forma que las de obra, más `modulo_id` / `sub_id` en la cabecera.
-- También amplía las policies del bucket `checklist-fotos` para que valgan
-- para las inspecciones de estas tablas (fotos y firmas van al mismo bucket).
-- Requiere inspecciones_obra.sql y storage_checklist_fotos.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.inspecciones (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.profiles (id) on delete cascade,
  modulo_id text not null,
  sub_id text,
  cliente text,
  ubicacion text,
  grupo_auditado text,
  fecha_hora timestamptz,
  tarea_observada text,
  estado text not null default 'borrador' check (estado in ('borrador', 'enviado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspecciones_inspector_modulo_idx
  on public.inspecciones (inspector_id, modulo_id, sub_id);

alter table public.inspecciones enable row level security;

create policy "Los inspectores ven sus propias inspecciones"
  on public.inspecciones for select using (auth.uid() = inspector_id);
create policy "Los inspectores crean sus propias inspecciones"
  on public.inspecciones for insert with check (auth.uid() = inspector_id);
create policy "Los inspectores actualizan sus propias inspecciones"
  on public.inspecciones for update using (auth.uid() = inspector_id);

drop trigger if exists on_inspeccion_updated on public.inspecciones;
create trigger on_inspeccion_updated
  before update on public.inspecciones
  for each row execute procedure public.handle_inspeccion_obra_updated_at();

create table if not exists public.inspecciones_checklist (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones (id) on delete cascade,
  codigo text not null,
  categoria text not null,
  item text not null,
  valor text not null check (valor in ('ok', 'no', 'na')),
  foto_url text,
  created_at timestamptz not null default now(),
  unique (inspeccion_id, codigo)
);

alter table public.inspecciones_checklist enable row level security;

create policy "Los inspectores ven las respuestas de sus inspecciones"
  on public.inspecciones_checklist for select
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores cargan respuestas en sus inspecciones"
  on public.inspecciones_checklist for insert
  with check (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores actualizan respuestas de sus inspecciones"
  on public.inspecciones_checklist for update
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));

create table if not exists public.inspecciones_hallazgos (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones (id) on delete cascade,
  titulo text not null,
  severidad text not null default 'Medio' check (severidad in ('Crítico', 'Medio', 'Bajo')),
  detalle text,
  responsable text,
  vence date,
  created_at timestamptz not null default now()
);

create index if not exists inspecciones_hallazgos_inspeccion_idx
  on public.inspecciones_hallazgos (inspeccion_id);

alter table public.inspecciones_hallazgos enable row level security;

create policy "Los inspectores ven los hallazgos de sus inspecciones"
  on public.inspecciones_hallazgos for select
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores cargan hallazgos en sus inspecciones"
  on public.inspecciones_hallazgos for insert
  with check (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores borran hallazgos de sus inspecciones"
  on public.inspecciones_hallazgos for delete
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));

create table if not exists public.inspecciones_firmas (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones (id) on delete cascade,
  rol text not null check (rol in ('inspector', 'responsable')),
  nombre text,
  ruta text not null,
  created_at timestamptz not null default now(),
  unique (inspeccion_id, rol)
);

alter table public.inspecciones_firmas enable row level security;

create policy "Los inspectores ven las firmas de sus inspecciones"
  on public.inspecciones_firmas for select
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores cargan firmas en sus inspecciones"
  on public.inspecciones_firmas for insert
  with check (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores actualizan firmas de sus inspecciones"
  on public.inspecciones_firmas for update
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));

-- Bucket de fotos y firmas: la inspección (primer segmento de la ruta) puede estar
-- en las tablas de obra o en las genéricas.
drop policy if exists "Los inspectores ven las fotos de sus inspecciones" on storage.objects;
drop policy if exists "Los inspectores suben fotos a sus inspecciones" on storage.objects;
drop policy if exists "Los inspectores borran fotos de sus inspecciones" on storage.objects;

create policy "Los inspectores ven las fotos de sus inspecciones"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'checklist-fotos'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );

create policy "Los inspectores suben fotos a sus inspecciones"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'checklist-fotos'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );

create policy "Los inspectores borran fotos de sus inspecciones"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'checklist-fotos'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );
