-- Destinatarios del informe: asocia "Nombre Apellido" (colaboradores) con su correo
-- y deja registrado a quién hay que enviarle el informe al cerrar la inspección.
--  - Guarda el correo del responsable en hallazgos y en la firma del responsable.
--  - Crea la cola de salida public.informes_envios: una fila por persona e inspección,
--    estado 'pendiente'. El envío real (Resend) todavía NO está conectado: cuando se
--    conecte, una Edge Function leerá las filas pendientes, mandará el mail y las
--    marcará 'enviado' (o 'error').
-- Requiere inspecciones_obra*.sql, inspecciones_generico.sql y colaboradores.sql.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.
-- Hasta que se ejecute, la app sigue funcionando: guarda todo sin los correos.

alter table public.inspecciones_obra_hallazgos add column if not exists responsable_correo text;
alter table public.inspecciones_hallazgos add column if not exists responsable_correo text;
alter table public.inspecciones_obra_firmas add column if not exists correo text;
alter table public.inspecciones_firmas add column if not exists correo text;

create table if not exists public.informes_envios (
  id uuid primary key default gen_random_uuid(),
  -- Sin FK: apunta a inspecciones_obra o a inspecciones según modulo_id.
  inspeccion_id uuid not null,
  modulo_id text not null default 'obra',
  nombre text,
  correo text not null,
  rol text not null check (rol in ('responsable', 'hallazgo')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'error')),
  error text,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  unique (inspeccion_id, correo)
);

create index if not exists informes_envios_pendientes_idx
  on public.informes_envios (created_at) where estado = 'pendiente';

comment on table public.informes_envios is
  'Cola de salida de informes: a quién enviar cada inspección cerrada. La consume '
  'la futura Edge Function de Resend (service role); el cliente solo inserta y lee.';

alter table public.informes_envios enable row level security;

-- El inspector ve e inserta solo los de sus propias inspecciones (en cualquiera de los dos juegos de tablas).
create policy "Los inspectores ven los envios de sus inspecciones"
  on public.informes_envios for select
  using (
    exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid())
    or exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid())
  );

create policy "Los inspectores registran los envios de sus inspecciones"
  on public.informes_envios for insert
  with check (
    estado = 'pendiente'
    and (
      exists (select 1 from public.inspecciones_obra i where i.id = inspeccion_id and i.inspector_id = auth.uid())
      or exists (select 1 from public.inspecciones i where i.id = inspeccion_id and i.inspector_id = auth.uid())
    )
  );
