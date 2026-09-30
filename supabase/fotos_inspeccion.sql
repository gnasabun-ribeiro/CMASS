-- Fotos generales de la inspección (se adjuntan en el Paso 4 · Cierre, arriba de las firmas).
-- Reemplazan a las fotos por ítem del checklist (las columnas `foto_url` quedaron sin uso).
-- Bucket privado `fotos-inspeccion`; ruta de cada archivo: <inspeccion_id>/<foto_id>.jpg
-- (el primer segmento se usa en las policies para validar que la inspección es del usuario).
-- Una tabla de fotos para Obra Pública y otra para los demás módulos.
-- Requiere inspecciones_obra.sql e inspecciones_generico.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-inspeccion',
  'fotos-inspeccion',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.inspecciones_obra_fotos (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones_obra (id) on delete cascade,
  ruta text not null,
  created_at timestamptz not null default now()
);

create index if not exists inspecciones_obra_fotos_inspeccion_idx
  on public.inspecciones_obra_fotos (inspeccion_id);

alter table public.inspecciones_obra_fotos enable row level security;

create policy "Los inspectores ven las fotos de sus inspecciones de obra"
  on public.inspecciones_obra_fotos for select
  using (exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores cargan fotos en sus inspecciones de obra"
  on public.inspecciones_obra_fotos for insert
  with check (exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores borran fotos de sus inspecciones de obra"
  on public.inspecciones_obra_fotos for delete
  using (exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid()));

create table if not exists public.inspecciones_fotos (
  id uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.inspecciones (id) on delete cascade,
  ruta text not null,
  created_at timestamptz not null default now()
);

create index if not exists inspecciones_fotos_inspeccion_idx
  on public.inspecciones_fotos (inspeccion_id);

alter table public.inspecciones_fotos enable row level security;

create policy "Los inspectores ven las fotos de sus inspecciones"
  on public.inspecciones_fotos for select
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores cargan fotos en sus inspecciones"
  on public.inspecciones_fotos for insert
  with check (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));
create policy "Los inspectores borran fotos de sus inspecciones"
  on public.inspecciones_fotos for delete
  using (exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid()));

-- Archivos del bucket: la inspección puede estar en las tablas de obra o en las genéricas.
create policy "Los inspectores ven las fotos generales de sus inspecciones"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-inspeccion'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );

create policy "Los inspectores suben fotos generales a sus inspecciones"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-inspeccion'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );

create policy "Los inspectores borran fotos generales de sus inspecciones"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-inspeccion'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid())
    )
  );
