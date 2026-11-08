-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — esquema Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Perfiles + roles ───────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'user' check (role in ('admin', 'user')),
  created_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper usado por las políticas RLS
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Evita que un usuario se auto-asigne el rol admin
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() and auth.uid() is not null then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (public.is_admin());

-- ── Clientes (interesados y fijos) ─────────────────────────────
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  email       text not null unique,
  telefono    text,
  empresa     text,
  tipo        text not null default 'interesado' check (tipo in ('interesado', 'fijo')),
  servicio    text,
  notas       text,
  suscrito    boolean not null default true,   -- false = no recibe correos masivos
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists clientes_tipo_idx on public.clientes (tipo);

alter table public.clientes enable row level security;

-- Usuarios autenticados pueden consultar; solo admin crea/edita/elimina.
-- (El formulario público de contacto inserta vía API con service role.)
drop policy if exists "clientes_select" on public.clientes;
create policy "clientes_select" on public.clientes
  for select using (auth.uid() is not null);

drop policy if exists "clientes_admin_write" on public.clientes;
create policy "clientes_admin_write" on public.clientes
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Registro de campañas de correo masivo ──────────────────────
create table if not exists public.campanas_email (
  id           uuid primary key default gen_random_uuid(),
  asunto       text not null,
  segmento     text not null,
  enviados     int  not null default 0,
  fallidos     int  not null default 0,
  creado_por   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.campanas_email enable row level security;

drop policy if exists "campanas_admin" on public.campanas_email;
create policy "campanas_admin" on public.campanas_email
  for all using (public.is_admin()) with check (public.is_admin());
