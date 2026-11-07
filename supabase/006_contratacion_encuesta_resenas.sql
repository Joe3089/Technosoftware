-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 006 (no destructiva, idempotente)
-- Contratación de proyectos (presupuesto → contrato firmado),
-- consultoría gratuita única para interesados, reunión final,
-- encuesta de servicio obligatoria antes de la entrega y reseñas.
-- Ejecutar después de 005_metodos_pago.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── Presupuesto (uno por proyecto; el admin lo reenvía tras un rechazo) ──
create table if not exists public.presupuestos (
  id             uuid primary key default gen_random_uuid(),
  proyecto_id    uuid not null unique references public.proyectos(id) on delete cascade,
  items          jsonb not null default '[]'::jsonb,   -- [{ concepto, cantidad, precio }]
  total          numeric(12, 2) not null check (total >= 0),
  moneda         text not null default 'USD',
  notas          text,
  valido_hasta   date,
  estado         text not null default 'enviado' check (estado in ('enviado', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  respondido_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Contrato (se habilita al aprobar el presupuesto) ──
--  pendiente_aprobacion → aprobado (el cliente lo acepta) → descargado → firmado (sube la copia firmada)
--  → verificado (admin) | firma_rechazada (admin pide subirlo de nuevo)
create table if not exists public.contratos (
  id             uuid primary key default gen_random_uuid(),
  proyecto_id    uuid not null unique references public.proyectos(id) on delete cascade,
  archivo_path   text not null,                    -- contrato emitido (bucket privado «adjuntos»)
  firmado_path   text,                             -- copia firmada por el cliente
  estado         text not null default 'pendiente_aprobacion'
                 check (estado in ('pendiente_aprobacion', 'aprobado', 'descargado', 'firmado', 'verificado', 'firma_rechazada')),
  observacion    text,
  aprobado_at    timestamptz,
  descargado_at  timestamptz,
  firmado_at     timestamptz,
  verificado_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Reunión final y entrega ──
alter table public.proyectos add column if not exists reunion_final_at timestamptz;

-- ── Encuesta de servicio (obligatoria antes de la entrega, después de la reunión final) ──
create table if not exists public.encuestas (
  id             uuid primary key default gen_random_uuid(),
  proyecto_id    uuid not null unique references public.proyectos(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  general        smallint not null check (general between 1 and 5),
  calidad        smallint not null check (calidad between 1 and 5),
  comunicacion   smallint not null check (comunicacion between 1 and 5),
  plazos         smallint not null check (plazos between 1 and 5),
  soporte        smallint not null check (soporte between 1 and 5),
  recomendaria   boolean not null,
  comentario     text check (comentario is null or length(comentario) <= 2000),
  created_at     timestamptz not null default now()
);

-- ── Reseñas (nacen de la encuesta si el cliente lo autoriza; el admin las publica) ──
create table if not exists public.resenas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  proyecto_id    uuid unique references public.proyectos(id) on delete set null,
  nombre         text not null check (length(nombre) between 1 and 120),
  empresa        text,
  calificacion   smallint not null check (calificacion between 1 and 5),
  texto          text not null check (length(texto) between 10 and 1000),
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'publicada', 'oculta')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists resenas_estado_idx on public.resenas (estado, created_at desc);

-- ── Consultorías: la gratuita de un interesado no va ligada a un proyecto ──
alter table public.consultorias alter column proyecto_id drop not null;
alter table public.consultorias add column if not exists gratuita boolean not null default false;

-- Proyecto contratado = contrato verificado, o proyecto ya en curso/culminado (proyectos previos a la contratación en línea)
create or replace function public.tiene_proyecto_contratado(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.proyectos p
    left join public.contratos c on c.proyecto_id = p.id
    where p.user_id = p_user
      and (c.estado = 'verificado' or p.estado in ('iniciado', 'en_progreso', 'revision', 'completado'))
  );
$$;

-- Una sola consultoría gratuita por usuario
create unique index if not exists consultorias_gratuita_unica on public.consultorias (user_id) where gratuita;

-- ── No se entrega (completado) sin reunión final ni encuesta ──
create or replace function public.validar_entrega() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'completado' and old.estado is distinct from 'completado' then
    if new.reunion_final_at is null then
      raise exception 'Registra la reunión final antes de entregar el proyecto' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.encuestas where proyecto_id = new.id) then
      raise exception 'El cliente debe completar la encuesta de servicio antes de la entrega' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists proyectos_validar_entrega on public.proyectos;
create trigger proyectos_validar_entrega before update of estado on public.proyectos
  for each row execute function public.validar_entrega();

-- ── RLS: lectura del dueño o admin; las escrituras pasan por la API (service role) ──
alter table public.presupuestos enable row level security;
alter table public.contratos    enable row level security;
alter table public.encuestas    enable row level security;
alter table public.resenas      enable row level security;

drop policy if exists "presupuestos_select" on public.presupuestos;
create policy "presupuestos_select" on public.presupuestos for select using (
  public.is_admin() or exists (select 1 from public.proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));

drop policy if exists "contratos_select" on public.contratos;
create policy "contratos_select" on public.contratos for select using (
  public.is_admin() or exists (select 1 from public.proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));

drop policy if exists "encuestas_select" on public.encuestas;
create policy "encuestas_select" on public.encuestas for select using (public.is_admin() or user_id = auth.uid());

drop policy if exists "resenas_select" on public.resenas;
create policy "resenas_select" on public.resenas for select using (estado = 'publicada' or user_id = auth.uid() or public.is_admin());
