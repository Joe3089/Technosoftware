-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 002 (no destructiva, idempotente)
-- Foto y datos de perfil persistentes, historial de actividad y
-- billetera (proyectos + libro de movimientos).
-- Ejecutar después de schema.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── Perfil: datos personales y foto ────────────────────────────
alter table public.profiles add column if not exists datos      jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists avatar_url text;  -- ruta dentro del bucket "avatars"

-- Bucket privado: solo el servidor sube (service role); se sirve con URLs firmadas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ── Historial de actividad (auditoría) ─────────────────────────
-- Sin políticas de escritura: solo el servidor (service role) y
-- funciones security definer pueden insertar. Los registros no se editan.
create table if not exists public.actividad (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,  -- a quién pertenece el evento
  actor_id     uuid references public.profiles(id) on delete set null,          -- quién lo ejecutó (p. ej. un admin)
  accion       text not null,
  descripcion  text not null,
  entidad      text,
  entidad_id   text,
  created_at   timestamptz not null default now()
);

create index if not exists actividad_user_fecha_idx on public.actividad (user_id, created_at desc, id desc);

alter table public.actividad enable row level security;

drop policy if exists "actividad_select" on public.actividad;
create policy "actividad_select" on public.actividad
  for select using (user_id = auth.uid() or public.is_admin());

-- Inicio de sesión: se registra desde Auth (no falsificable por el cliente)
create or replace function public.log_inicio_sesion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.actividad (user_id, actor_id, accion, descripcion, entidad)
  select new.user_id, new.user_id, 'inicio_sesion', 'Inicio de sesión', 'sesion'
  where exists (select 1 from public.profiles where id = new.user_id);
  return new;
end $$;

drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute function public.log_inicio_sesion();

-- ── Proyectos ──────────────────────────────────────────────────
create table if not exists public.proyectos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,  -- cliente dueño
  nombre       text not null,
  descripcion  text,
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'en_progreso', 'revision', 'completado', 'cancelado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists proyectos_user_idx on public.proyectos (user_id);

alter table public.proyectos enable row level security;

drop policy if exists "proyectos_select" on public.proyectos;
create policy "proyectos_select" on public.proyectos
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "proyectos_admin_write" on public.proyectos;
create policy "proyectos_admin_write" on public.proyectos
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Movimientos de la billetera (libro inmutable, USD) ─────────
--   abono      → entra dinero a la billetera (saldo disponible +)
--   asignacion → disponible → proyecto
--   consumo    → se gasta saldo asignado a un proyecto
--   reembolso  → proyecto → disponible
create table if not exists public.movimientos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  proyecto_id  uuid references public.proyectos(id) on delete restrict,
  tipo         text not null check (tipo in ('abono', 'asignacion', 'consumo', 'reembolso')),
  monto        numeric(12, 2) not null check (monto > 0),
  metodo       text,
  referencia   text,
  descripcion  text,
  creado_por   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  check ((tipo = 'abono') = (proyecto_id is null))
);

create index if not exists movimientos_user_idx on public.movimientos (user_id, created_at desc);

alter table public.movimientos enable row level security;

-- Solo lectura vía RLS; las escrituras pasan por registrar_movimiento()
drop policy if exists "movimientos_select" on public.movimientos;
create policy "movimientos_select" on public.movimientos
  for select using (user_id = auth.uid() or public.is_admin());

-- Registro atómico con validación de saldo (serializado por usuario)
create or replace function public.registrar_movimiento(
  p_user uuid, p_tipo text, p_monto numeric, p_proyecto uuid,
  p_metodo text, p_referencia text, p_descripcion text, p_actor uuid
) returns public.movimientos
language plpgsql security definer set search_path = public as $$
declare
  v_disponible numeric;
  v_restante   numeric;
  v_nombre     text;
  v_mov        public.movimientos;
begin
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor que 0'; end if;
  if p_tipo not in ('abono', 'asignacion', 'consumo', 'reembolso') then raise exception 'Tipo de movimiento inválido'; end if;
  if (p_tipo = 'abono') <> (p_proyecto is null) then
    raise exception 'Los abonos no llevan proyecto; los demás movimientos sí';
  end if;

  perform pg_advisory_xact_lock(hashtext('billetera:' || p_user::text));

  if p_proyecto is not null then
    select nombre into v_nombre from public.proyectos where id = p_proyecto and user_id = p_user;
    if v_nombre is null then raise exception 'El proyecto no pertenece a este usuario'; end if;
  end if;

  select coalesce(sum(case tipo when 'abono' then monto when 'reembolso' then monto when 'asignacion' then -monto else 0 end), 0)
    into v_disponible from public.movimientos where user_id = p_user;

  if p_tipo = 'asignacion' and p_monto > v_disponible then
    raise exception 'Saldo disponible insuficiente (%)', v_disponible;
  end if;

  if p_tipo in ('consumo', 'reembolso') then
    select coalesce(sum(case tipo when 'asignacion' then monto else -monto end), 0)
      into v_restante from public.movimientos where user_id = p_user and proyecto_id = p_proyecto;
    if p_monto > v_restante then raise exception 'Saldo del proyecto insuficiente (%)', v_restante; end if;
  end if;

  insert into public.movimientos (user_id, proyecto_id, tipo, monto, metodo, referencia, descripcion, creado_por)
  values (p_user, p_proyecto, p_tipo, round(p_monto, 2), p_metodo, p_referencia, p_descripcion, p_actor)
  returning * into v_mov;

  insert into public.actividad (user_id, actor_id, accion, descripcion, entidad, entidad_id)
  values (p_user, p_actor, 'movimiento_' || p_tipo,
          initcap(p_tipo) || ' de ' || to_char(v_mov.monto, 'FM999G999G990D00') || ' USD'
            || coalesce(' — proyecto «' || v_nombre || '»', ''),
          'movimiento', v_mov.id::text);

  return v_mov;
end $$;

-- Solo el servidor (service role) puede ejecutarla
revoke all on function public.registrar_movimiento(uuid, text, numeric, uuid, text, text, text, uuid) from public, anon, authenticated;
