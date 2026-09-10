-- Perfil de usuario, vinculado 1 a 1 con auth.users.
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query.

create table if not exists public.profiles (
  id uuid references auth.users (id) on delete cascade primary key,
  email text not null,
  nombre text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea el perfil automáticamente cuando se crea un usuario nuevo en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, initcap(replace(split_part(new.email, '@', 1), '.', ' ')));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
