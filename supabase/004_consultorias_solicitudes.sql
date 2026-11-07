-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 004 (no destructiva, idempotente)
-- Consultorías sobre proyectos activos, levantamiento de nuevos
-- proyectos, solicitudes de reunión y archivos adjuntos.
-- Ejecutar después de 003_recargas_proyectos.sql.
-- Escrituras: solo el servidor (service role) tras validar; lectura por RLS.
-- ═══════════════════════════════════════════════════════════════

-- ── Consultorías (sobre un proyecto en desarrollo) ─────────────
create table if not exists public.consultorias (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique default ('CON-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  proyecto_id        uuid not null references public.proyectos(id) on delete restrict,
  objetivo           text not null,
  descripcion        text not null,
  situacion_actual   text,
  problema           text,
  resultado_esperado text,
  prioridad          text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  observaciones      text,
  estado             text not null default 'recibida' check (estado in ('recibida', 'en_revision', 'respondida', 'cerrada')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists consultorias_user_idx on public.consultorias (user_id, created_at desc);

-- ── Solicitudes de nuevo proyecto (no crean un proyecto: requieren aprobación) ──
create table if not exists public.solicitudes_proyecto (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique default ('SOL-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  -- A. Información general
  nombre                 text not null,
  empresa                text,
  responsable            text not null,
  sector                 text,
  descripcion            text not null,
  -- B. Necesidad y objetivos
  problema               text not null,
  objetivo               text not null,
  objetivos_especificos  text,
  publico                text,
  beneficios             text,
  -- C. Alcance y requerimientos
  funcionalidades        text not null,
  req_funcionales        text,
  req_no_funcionales     text,
  plataformas            text[] not null default '{}',
  integraciones          text,
  restricciones          text,
  seguridad              text,
  -- D. Planificación
  fecha_inicio_deseada   date,
  fecha_entrega          date,
  prioridad              text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  presupuesto            numeric(12, 2) check (presupuesto is null or presupuesto >= 0),
  riesgos                text,
  -- E. Referencias
  enlaces                text[] not null default '{}',
  estado                 text not null default 'pendiente_revision'
                         check (estado in ('pendiente_revision', 'en_revision', 'aprobada', 'rechazada')),
  proyecto_id            uuid references public.proyectos(id) on delete set null,  -- si se aprueba
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (fecha_entrega is null or fecha_inicio_deseada is null or fecha_entrega >= fecha_inicio_deseada)
);
create index if not exists solicitudes_user_idx on public.solicitudes_proyecto (user_id, created_at desc);

-- ── Reuniones con el consultor (vinculadas a UNA solicitud de origen) ──
create table if not exists public.reuniones (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  consultoria_id     uuid unique references public.consultorias(id) on delete cascade,
  solicitud_id       uuid unique references public.solicitudes_proyecto(id) on delete cascade,
  telefono           text not null,
  canales            text[] not null default '{}' check (canales <@ array['whatsapp', 'telegram']),
  email_personal     text,
  email_corporativo  text,
  empresa            text,
  direccion          text,
  lat                double precision check (lat between -90 and 90),
  lng                double precision check (lng between -180 and 180),
  place_id           text,
  ubicacion_fuente   text check (ubicacion_fuente in ('google', 'openstreetmap', 'manual')),
  fecha_hora         timestamptz not null,       -- instante exacto (UTC)
  zona_horaria       text not null,              -- IANA, para mostrarla como la pidió el usuario
  modalidad          text not null default 'virtual' check (modalidad in ('virtual', 'presencial')),
  motivo             text not null,
  observaciones      text,
  estado             text not null default 'pendiente_confirmacion'
                     check (estado in ('pendiente_confirmacion', 'confirmada', 'reprogramar', 'cancelada')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((consultoria_id is null) <> (solicitud_id is null)),
  check ((lat is null) = (lng is null)),
  check (email_personal is not null or email_corporativo is not null),
  check (modalidad = 'virtual' or direccion is not null)
);

-- ── Adjuntos (bucket privado) ──────────────────────────────────
create table if not exists public.adjuntos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  consultoria_id  uuid references public.consultorias(id) on delete cascade,
  solicitud_id    uuid references public.solicitudes_proyecto(id) on delete cascade,
  path            text not null unique,
  nombre          text not null,
  mime            text not null,
  tamano          int  not null check (tamano > 0),
  created_at      timestamptz not null default now(),
  check ((consultoria_id is null) <> (solicitud_id is null))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 4194304, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ── RLS: dueño o admin leen; nadie escribe desde el cliente ────
alter table public.consultorias         enable row level security;
alter table public.solicitudes_proyecto enable row level security;
alter table public.reuniones            enable row level security;
alter table public.adjuntos             enable row level security;

drop policy if exists "consultorias_select" on public.consultorias;
create policy "consultorias_select" on public.consultorias for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "solicitudes_select" on public.solicitudes_proyecto;
create policy "solicitudes_select" on public.solicitudes_proyecto for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "reuniones_select" on public.reuniones;
create policy "reuniones_select" on public.reuniones for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "adjuntos_select" on public.adjuntos;
create policy "adjuntos_select" on public.adjuntos for select using (user_id = auth.uid() or public.is_admin());

-- Seguimiento por el admin (estado)
drop policy if exists "consultorias_admin_update" on public.consultorias;
create policy "consultorias_admin_update" on public.consultorias for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "solicitudes_admin_update" on public.solicitudes_proyecto;
create policy "solicitudes_admin_update" on public.solicitudes_proyecto for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reuniones_admin_update" on public.reuniones;
create policy "reuniones_admin_update" on public.reuniones for update using (public.is_admin()) with check (public.is_admin());
