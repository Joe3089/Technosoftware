-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 003 (no destructiva, idempotente)
-- Recargas de saldo (PayPal) y seguimiento de proyectos
-- (fechas reales, fase, avance, responsable y observaciones).
-- Ejecutar después de 002_perfil_actividad_billetera.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── Proyectos: estado "iniciado" + datos de seguimiento ────────
-- Clasificación:  pendiente = por iniciar · iniciado = arranque registrado
--                 en_progreso / revision = en proceso · completado = culminado
alter table public.proyectos drop constraint if exists proyectos_estado_check;
alter table public.proyectos add constraint proyectos_estado_check
  check (estado in ('pendiente', 'iniciado', 'en_progreso', 'revision', 'completado', 'cancelado'));

alter table public.proyectos add column if not exists fase         text
  check (fase in ('analisis', 'diseno', 'desarrollo', 'pruebas', 'despliegue'));
alter table public.proyectos add column if not exists avance       smallint check (avance between 0 and 100);
alter table public.proyectos add column if not exists responsable  text;
alter table public.proyectos add column if not exists fecha_inicio timestamptz;  -- inicio real (no es created_at)
alter table public.proyectos add column if not exists fecha_fin    timestamptz;  -- culminación real

do $$ begin
  alter table public.proyectos add constraint proyectos_fechas_check
    check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio);
exception when duplicate_object then null; end $$;

-- Sella las fechas reales en el momento en que ocurre el cambio de estado.
-- Nunca sobrescribe fechas ya registradas.
create or replace function public.proyectos_fechas()
returns trigger language plpgsql as $$
begin
  -- Solo al entrar en un estado de trabajo; un proyecto registrado directamente como
  -- culminado no recibe un inicio inventado (su duración queda "No disponible").
  if new.estado in ('iniciado', 'en_progreso', 'revision') and new.fecha_inicio is null
     and (tg_op = 'INSERT' or old.estado is distinct from new.estado) then
    new.fecha_inicio := now();
  end if;
  if new.estado = 'completado' and new.fecha_fin is null
     and (tg_op = 'INSERT' or old.estado is distinct from new.estado) then
    new.fecha_fin := now();
  end if;
  return new;
end $$;

drop trigger if exists proyectos_fechas on public.proyectos;
create trigger proyectos_fechas
  before insert or update on public.proyectos
  for each row execute function public.proyectos_fechas();

create index if not exists proyectos_estado_idx on public.proyectos (estado, updated_at desc);

-- ── Observaciones de proyecto (inmutables, trazables) ──────────
create table if not exists public.proyecto_observaciones (
  id           bigint generated always as identity primary key,
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  autor_id     uuid references public.profiles(id) on delete set null,
  tipo         text not null default 'avance'
               check (tipo in ('avance', 'incidencia', 'bloqueo', 'proximo_paso', 'cierre')),
  texto        text not null check (length(texto) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists observaciones_proyecto_idx on public.proyecto_observaciones (proyecto_id, created_at desc);

alter table public.proyecto_observaciones enable row level security;

drop policy if exists "observaciones_select" on public.proyecto_observaciones;
create policy "observaciones_select" on public.proyecto_observaciones
  for select using (
    public.is_admin()
    or exists (select 1 from public.proyectos p where p.id = proyecto_id and p.user_id = auth.uid())
  );

drop policy if exists "observaciones_admin_insert" on public.proyecto_observaciones;
create policy "observaciones_admin_insert" on public.proyecto_observaciones
  for insert with check (public.is_admin());

-- ── Recargas de saldo ──────────────────────────────────────────
create table if not exists public.recargas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  monto         numeric(12, 2) not null check (monto > 0),
  moneda        text not null default 'USD' check (moneda = 'USD'),
  proveedor     text not null default 'paypal',
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'aprobado', 'rechazado', 'cancelado', 'error')),
  order_id      text unique,     -- id de la orden en el proveedor
  capture_id    text unique,     -- id del cobro confirmado (garantiza un solo abono)
  movimiento_id uuid unique references public.movimientos(id),
  detalle       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists recargas_user_idx on public.recargas (user_id, created_at desc);

alter table public.recargas enable row level security;

-- Solo lectura para el dueño/admin; las escrituras las hace el servidor
drop policy if exists "recargas_select" on public.recargas;
create policy "recargas_select" on public.recargas
  for select using (user_id = auth.uid() or public.is_admin());

-- Acredita una recarga confirmada por el proveedor. Idempotente:
-- si ya fue acreditada devuelve la misma fila sin crear otro abono.
create or replace function public.acreditar_recarga(p_recarga uuid, p_capture text, p_monto numeric, p_moneda text)
returns public.recargas
language plpgsql security definer set search_path = public as $$
declare
  v_rec public.recargas;
  v_mov public.movimientos;
begin
  select * into v_rec from public.recargas where id = p_recarga for update;
  if not found then raise exception 'Recarga inexistente'; end if;
  if v_rec.estado = 'aprobado' then return v_rec; end if;
  if p_moneda <> v_rec.moneda or round(p_monto, 2) <> v_rec.monto then
    update public.recargas set estado = 'error', detalle = 'El importe confirmado no coincide', updated_at = now()
      where id = p_recarga returning * into v_rec;
    return v_rec;
  end if;

  v_mov := public.registrar_movimiento(v_rec.user_id, 'abono', v_rec.monto, null,
                                       'PayPal', p_capture, 'Recarga de saldo', v_rec.user_id);

  update public.recargas
     set estado = 'aprobado', capture_id = p_capture, movimiento_id = v_mov.id, detalle = null, updated_at = now()
   where id = p_recarga
  returning * into v_rec;
  return v_rec;
end $$;

revoke all on function public.acreditar_recarga(uuid, text, numeric, text) from public, anon, authenticated;
