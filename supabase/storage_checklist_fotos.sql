-- Bucket privado para las fotos adjuntas del checklist de Obra Pública.
-- Ruta de cada archivo: <inspeccion_id>/<codigo del ítem>/<timestamp>.<ext>
-- (el primer segmento se usa en las policies para validar que la inspección
-- es del usuario). La ruta se guarda en inspecciones_obra_checklist.foto_url.
-- Requiere haber ejecutado antes supabase/inspecciones_obra.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checklist-fotos',
  'checklist-fotos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Los inspectores ven las fotos de sus inspecciones"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'checklist-fotos'
    and exists (
      select 1 from public.inspecciones_obra i
      where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores suben fotos a sus inspecciones"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'checklist-fotos'
    and exists (
      select 1 from public.inspecciones_obra i
      where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid()
    )
  );

create policy "Los inspectores borran fotos de sus inspecciones"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'checklist-fotos'
    and exists (
      select 1 from public.inspecciones_obra i
      where i.id::text = (storage.foldername(name))[1] and i.inspector_id = auth.uid()
    )
  );
