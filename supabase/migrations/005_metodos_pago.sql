-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 005 (no destructiva, idempotente)
-- Pasarela unificada: catálogo de métodos de pago y recargas con
-- verificación automática (PayPal) o manual (referencia + revisión admin).
-- Ejecutar después de 004_consultorias_solicitudes.sql.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.metodos_pago (
  id            text primary key,
  nombre        text not null,
  tipo          text not null check (tipo in ('automatico', 'manual')),
  moneda        text not null,                       -- moneda en la que paga el cliente
  activo        boolean not null default false,      -- el admin lo activa al cargar sus datos
  datos         jsonb not null default '{}'::jsonb,  -- datos de la cuenta receptora (los carga el admin)
  instrucciones text,
  orden         int not null default 0,
  updated_at    timestamptz not null default now()
);

-- Catálogo inicial: SIN datos de cuentas (no se inventan); inactivos salvo configuración
insert into public.metodos_pago (id, nombre, tipo, moneda, orden) values
  ('paypal',       'PayPal',           'automatico', 'USD',  1),
  ('zelle',        'Zelle',            'manual',     'USD',  2),
  ('binance',      'Binance Pay',      'manual',     'USDT', 3),
  ('airtm',        'AirTM',            'manual',     'USD',  4),
  ('pago_movil',   'Pago Móvil',       'manual',     'VES',  5),
  ('mercantil_pa', 'Mercantil Panamá', 'manual',     'USD',  6)
on conflict (id) do nothing;

alter table public.metodos_pago enable row level security;

-- Cualquier usuario autenticado ve los métodos (incluye los datos de la cuenta receptora)
drop policy if exists "metodos_select" on public.metodos_pago;
create policy "metodos_select" on public.metodos_pago for select using (auth.uid() is not null);
drop policy if exists "metodos_admin_update" on public.metodos_pago;
create policy "metodos_admin_update" on public.metodos_pago for update using (public.is_admin()) with check (public.is_admin());

-- ── Recargas: método, referencia del pago y comprobante ────────
alter table public.recargas add column if not exists metodo           text not null default 'paypal' references public.metodos_pago(id);
alter table public.recargas add column if not exists referencia       text;     -- nº de confirmación que reporta el cliente
alter table public.recargas add column if not exists monto_origen     numeric(14, 2) check (monto_origen is null or monto_origen > 0);
alter table public.recargas add column if not exists moneda_origen    text;
alter table public.recargas add column if not exists fecha_pago       date;
alter table public.recargas add column if not exists comprobante_path text;     -- bucket "adjuntos"
alter table public.recargas add column if not exists revisado_por     uuid references public.profiles(id) on delete set null;

-- Una misma referencia no puede reportarse dos veces en el mismo método
create unique index if not exists recargas_metodo_referencia_uq
  on public.recargas (metodo, upper(referencia)) where referencia is not null;

-- acreditar_recarga: el movimiento usa el nombre real del método
create or replace function public.acreditar_recarga(p_recarga uuid, p_capture text, p_monto numeric, p_moneda text)
returns public.recargas
language plpgsql security definer set search_path = public as $$
declare
  v_rec    public.recargas;
  v_mov    public.movimientos;
  v_nombre text;
begin
  select * into v_rec from public.recargas where id = p_recarga for update;
  if not found then raise exception 'Recarga inexistente'; end if;
  if v_rec.estado = 'aprobado' then return v_rec; end if;
  if p_moneda <> v_rec.moneda or round(p_monto, 2) <> v_rec.monto then
    update public.recargas set estado = 'error', detalle = 'El importe confirmado no coincide', updated_at = now()
      where id = p_recarga returning * into v_rec;
    return v_rec;
  end if;

  select nombre into v_nombre from public.metodos_pago where id = v_rec.metodo;
  v_mov := public.registrar_movimiento(v_rec.user_id, 'abono', v_rec.monto, null,
                                       coalesce(v_nombre, v_rec.metodo), coalesce(v_rec.referencia, p_capture),
                                       'Recarga de saldo', v_rec.user_id);

  update public.recargas
     set estado = 'aprobado', capture_id = p_capture, movimiento_id = v_mov.id, detalle = null, updated_at = now()
   where id = p_recarga
  returning * into v_rec;
  return v_rec;
end $$;

revoke all on function public.acreditar_recarga(uuid, text, numeric, text) from public, anon, authenticated;
