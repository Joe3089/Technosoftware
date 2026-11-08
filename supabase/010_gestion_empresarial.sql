-- ════════════════════════════════════════════════════════════════════
-- 010 · Plataforma interna de gestión (/gestion)
-- Aditiva: no borra ni altera datos de clientes, proyectos, billetera,
-- consultorías ni solicitudes. Ejecutar después de 009.
--
-- Modelo de acceso
--   · Administrador principal = profiles.role = 'admin' (único, índice parcial).
--   · Personal interno = fila ACTIVA en public.empleados enlazada a su profile.
--   · Los clientes (role 'user' sin empleado activo) no ven nada de este módulo.
--   · Permisos = rol interno + departamento (heredado por sub-áreas) + cargo
--     + excepciones por empleado (asignaciones_permiso). Config = solo admin.
--   · Helpers SECURITY DEFINER en el esquema no expuesto "app".
-- ════════════════════════════════════════════════════════════════════

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Un solo administrador con privilegios globales
create unique index if not exists profiles_admin_unico on public.profiles (role) where role = 'admin';

-- ── Organización ─────────────────────────────────────────────────────
create table if not exists public.departamentos (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique check (codigo ~ '^[A-Z0-9_]{2,12}$'),
  nombre         text not null check (char_length(nombre) between 2 and 80),
  descripcion    text,
  padre_id       uuid references public.departamentos(id) on delete restrict,
  coordinador_id uuid,  -- FK se añade tras crear empleados
  orden          int  not null default 0,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (padre_id is distinct from id)
);
create index if not exists departamentos_padre_idx on public.departamentos (padre_id);

create table if not exists public.cargos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(nombre) between 2 and 80),
  departamento_id uuid references public.departamentos(id) on delete restrict,
  descripcion     text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (nombre, departamento_id)
);

create table if not exists public.empleados (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid unique references public.profiles(id) on delete set null,
  nombre                text not null check (char_length(nombre) between 1 and 80),
  apellido              text not null default '' check (char_length(apellido) <= 80),
  email_corporativo     text not null check (email_corporativo ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  telefono              text,
  departamento_id       uuid references public.departamentos(id) on delete restrict,
  cargo_id              uuid references public.cargos(id) on delete set null,
  supervisor_id         uuid references public.empleados(id) on delete set null,
  rol_interno           text not null default 'empleado' check (rol_interno in ('coordinador', 'supervisor', 'empleado')),
  fecha_ingreso         date,
  tipo_contrato         text,
  estado                text not null default 'activo' check (estado in ('activo', 'inactivo', 'desvinculado')),
  fecha_desvinculacion  date,
  motivo_desvinculacion text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  check (supervisor_id is distinct from id),
  check ((estado = 'desvinculado') = (fecha_desvinculacion is not null))
);
create unique index if not exists empleados_email_uidx on public.empleados (lower(email_corporativo)) where deleted_at is null;
create index if not exists empleados_depto_idx on public.empleados (departamento_id);
create index if not exists empleados_estado_idx on public.empleados (estado);

do $$ begin
  alter table public.departamentos add constraint departamentos_coordinador_fk
    foreign key (coordinador_id) references public.empleados(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Datos personales sensibles (solo admin, el propio empleado y Talento Humano)
create table if not exists public.empleado_datos (
  empleado_id uuid primary key references public.empleados(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.empleado_evaluaciones (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references public.empleados(id) on delete restrict,
  evaluador_id uuid references public.empleados(id) on delete set null,
  periodo      text not null check (char_length(periodo) between 4 and 20),
  puntaje      numeric(4,2) not null check (puntaje between 0 and 10),
  comentarios  text,
  created_at   timestamptz not null default now()
);
create index if not exists evaluaciones_empleado_idx on public.empleado_evaluaciones (empleado_id);

-- ── Permisos ─────────────────────────────────────────────────────────
create table if not exists public.permisos (
  codigo      text primary key check (codigo ~ '^[a-z_]+\.[a-z_]+$'),
  modulo      text not null,
  descripcion text not null
);

create table if not exists public.asignaciones_permiso (
  id          uuid primary key default gen_random_uuid(),
  sujeto_tipo text not null check (sujeto_tipo in ('rol', 'departamento', 'cargo', 'empleado')),
  sujeto_id   text not null,  -- rol_interno o uuid como texto
  permiso     text not null references public.permisos(codigo) on delete cascade,
  concedido   boolean not null default true,  -- false = denegación explícita (solo para empleado)
  created_at  timestamptz not null default now(),
  unique (sujeto_tipo, sujeto_id, permiso),
  check (concedido or sujeto_tipo = 'empleado')
);

-- ── Helpers de autorización (no expuestos por la Data API) ───────────
create or replace function app.mi_empleado_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.empleados e
  where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null;
$$;

create or replace function app.es_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or app.mi_empleado_id() is not null;
$$;

create or replace function app.mi_rol() returns text
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then 'admin'
    else (select e.rol_interno from public.empleados e
          where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null) end;
$$;

-- Departamentos al alcance: el propio + sub-áreas (coordinador/supervisor) + los que coordina
create or replace function app.mis_departamentos() returns uuid[]
language sql stable security definer set search_path = '' as $$
  with recursive yo as (
    select e.id, e.departamento_id, e.rol_interno from public.empleados e
    where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null
  ), raiz as (
    select departamento_id as id from yo where departamento_id is not null
    union select d.id from public.departamentos d join yo on d.coordinador_id = yo.id
  ), arbol as (
    select id from raiz
    union select d.id from public.departamentos d join arbol a on d.padre_id = a.id
      where exists (select 1 from yo where rol_interno in ('coordinador', 'supervisor'))
         or exists (select 1 from yo join public.departamentos c on c.coordinador_id = yo.id)
  )
  select coalesce(array_agg(id), '{}') from arbol;
$$;

create or replace function app.tiene_permiso(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  with recursive yo as (
    select e.id, e.rol_interno, e.departamento_id, e.cargo_id from public.empleados e
    where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null
  ), ancestros as (
    -- Sub-área hereda de su área, pero nadie hereda de la raíz (Dirección General) salvo sus propios miembros
    select departamento_id as id from yo where departamento_id is not null
    union select d.padre_id from public.departamentos d join ancestros a on d.id = a.id
      join public.departamentos p on p.id = d.padre_id where p.padre_id is not null
  )
  select case
    when public.is_admin() then true
    when not exists (select 1 from yo) then false
    when exists (select 1 from public.asignaciones_permiso a, yo
                 where a.sujeto_tipo = 'empleado' and a.sujeto_id = yo.id::text and a.permiso = p and not a.concedido) then false
    else exists (select 1 from public.asignaciones_permiso a, yo where a.permiso = p and a.concedido and (
         (a.sujeto_tipo = 'empleado' and a.sujeto_id = yo.id::text)
      or (a.sujeto_tipo = 'rol' and a.sujeto_id = yo.rol_interno)
      or (a.sujeto_tipo = 'cargo' and a.sujeto_id = yo.cargo_id::text)
      or (a.sujeto_tipo = 'departamento' and a.sujeto_id in (select id::text from ancestros))))
  end;
$$;

-- Lista de permisos efectivos (para que la UI oculte lo que no corresponde; el servidor y RLS deciden)
create or replace function app.mis_permisos() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.codigo order by p.codigo), '{}') from public.permisos p where app.tiene_permiso(p.codigo);
$$;

-- ── Catálogos y parámetros configurables ─────────────────────────────
create table if not exists public.catalogos (
  id     uuid primary key default gen_random_uuid(),
  tipo   text not null check (tipo ~ '^[a-z_]+$'),
  valor  text not null check (char_length(valor) between 1 and 80),
  orden  int not null default 0,
  activo boolean not null default true,
  unique (tipo, valor)
);

create table if not exists public.parametros (
  clave       text primary key check (clave ~ '^[a-z_.]+$'),
  valor       jsonb not null,
  descripcion text,
  updated_at  timestamptz not null default now()
);

-- ── Proyectos: se reutiliza public.proyectos ─────────────────────────
-- Proyectos internos o de prospectos sin cuenta: user_id deja de ser obligatorio.
alter table public.proyectos alter column user_id drop not null;
alter table public.proyectos add column if not exists codigo          text;
alter table public.proyectos add column if not exists cliente_id      uuid references public.clientes(id) on delete set null;
alter table public.proyectos add column if not exists departamento_id uuid references public.departamentos(id) on delete set null;
alter table public.proyectos add column if not exists coordinador_id  uuid references public.empleados(id) on delete set null;
alter table public.proyectos add column if not exists prioridad       text not null default 'media';
alter table public.proyectos add column if not exists presupuesto     numeric(14,2) check (presupuesto >= 0);
alter table public.proyectos add column if not exists moneda          text not null default 'USD';
alter table public.proyectos add column if not exists inicio_plan     date;
alter table public.proyectos add column if not exists fin_plan        date;
alter table public.proyectos add column if not exists etapa           text not null default 'prospeccion';
alter table public.proyectos add column if not exists deleted_at      timestamptz;
do $$ begin
  alter table public.proyectos add constraint proyectos_prioridad_check check (prioridad in ('baja', 'media', 'alta', 'urgente'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.proyectos add constraint proyectos_etapa_check check (etapa in (
    'prospeccion', 'calificacion', 'descubrimiento', 'propuesta', 'contrato', 'arquitectura',
    'desarrollo_qa', 'implementacion', 'capacitacion', 'facturacion', 'soporte'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.proyectos add constraint proyectos_plan_check check (fin_plan is null or inicio_plan is null or fin_plan >= inicio_plan);
exception when duplicate_object then null; end $$;

create sequence if not exists public.proyectos_codigo_seq;
create or replace function app.proyecto_codigo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'PRY-' || lpad(nextval('public.proyectos_codigo_seq')::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists proyectos_codigo on public.proyectos;
create trigger proyectos_codigo before insert on public.proyectos for each row execute function app.proyecto_codigo();
update public.proyectos set codigo = 'PRY-' || lpad(nextval('public.proyectos_codigo_seq')::text, 4, '0')
  where codigo is null;
create unique index if not exists proyectos_codigo_uidx on public.proyectos (codigo);
create index if not exists proyectos_depto_idx on public.proyectos (departamento_id);
create index if not exists proyectos_cliente_idx on public.proyectos (cliente_id);

-- La entrega con reunión final + encuesta aplica a proyectos de clientes con cuenta
create or replace function public.validar_entrega() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'completado' and old.estado is distinct from 'completado' and new.user_id is not null then
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

create table if not exists public.proyecto_equipo (
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  empleado_id uuid not null references public.empleados(id) on delete restrict,
  rol         text,
  created_at  timestamptz not null default now(),
  primary key (proyecto_id, empleado_id)
);
create index if not exists proyecto_equipo_empleado_idx on public.proyecto_equipo (empleado_id);

create table if not exists public.proyecto_hitos (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 160),
  fecha       date not null,
  completado  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists proyecto_hitos_proyecto_idx on public.proyecto_hitos (proyecto_id);

-- Requerimientos, entregables, incidencias y documentación del expediente
create table if not exists public.proyecto_items (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  tipo        text not null check (tipo in ('requerimiento', 'entregable', 'incidencia', 'documento')),
  titulo      text not null check (char_length(titulo) between 1 and 200),
  descripcion text,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'cumplido', 'descartado')),
  creado_por  uuid references public.empleados(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists proyecto_items_proyecto_idx on public.proyecto_items (proyecto_id, tipo);

create or replace function app.en_equipo(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.proyecto_equipo pe where pe.proyecto_id = pid and pe.empleado_id = app.mi_empleado_id())
      or exists (select 1 from public.proyectos p where p.id = pid and p.coordinador_id = app.mi_empleado_id());
$$;

-- ── Contactos (directorio único; proveedores incluidos) ──────────────
create table if not exists public.contactos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 80),
  apellido      text not null default '',
  empresa       text,
  cargo         text,
  telefono      text,
  whatsapp      text,
  email         text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  direccion     text,
  pais          text,
  tipo          text not null default 'contacto' check (tipo in ('cliente', 'prospecto', 'proveedor', 'socio', 'contacto', 'otro')),
  observaciones text,
  cliente_id    uuid references public.clientes(id) on delete set null,
  creado_por    uuid references public.empleados(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index if not exists contactos_email_uidx on public.contactos (lower(email)) where email is not null and deleted_at is null;
create unique index if not exists contactos_whatsapp_uidx on public.contactos (regexp_replace(whatsapp, '\D', '', 'g'))
  where whatsapp is not null and deleted_at is null;
create index if not exists contactos_tipo_idx on public.contactos (tipo);
create index if not exists contactos_cliente_idx on public.contactos (cliente_id);

create table if not exists public.proyecto_contactos (
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  contacto_id uuid not null references public.contactos(id) on delete restrict,
  rol         text,
  primary key (proyecto_id, contacto_id)
);

-- ── Actividades ──────────────────────────────────────────────────────
create table if not exists public.tareas (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null check (char_length(titulo) between 1 and 200),
  descripcion       text,
  proyecto_id       uuid references public.proyectos(id) on delete set null,
  departamento_id   uuid references public.departamentos(id) on delete set null,
  responsable_id    uuid references public.empleados(id) on delete set null,
  padre_id          uuid references public.tareas(id) on delete cascade,  -- subtareas
  prioridad         text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  estado            text not null default 'por_hacer'
                    check (estado in ('por_hacer', 'en_progreso', 'en_revision', 'bloqueada', 'completada', 'cancelada')),
  inicio            date,
  fin               date,
  duracion_estimada numeric(8,2) check (duracion_estimada >= 0),  -- horas
  tiempo_real       numeric(8,2) not null default 0 check (tiempo_real >= 0),
  progreso          smallint not null default 0 check (progreso between 0 and 100),
  es_hito           boolean not null default false,
  orden             double precision not null default extract(epoch from now()),
  creado_por        uuid references public.empleados(id) on delete set null,
  completada_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (fin is null or inicio is null or fin >= inicio),
  check (padre_id is distinct from id)
);
create index if not exists tareas_estado_idx on public.tareas (estado, orden) where deleted_at is null;
create index if not exists tareas_responsable_idx on public.tareas (responsable_id) where deleted_at is null;
create index if not exists tareas_proyecto_idx on public.tareas (proyecto_id);
create index if not exists tareas_depto_idx on public.tareas (departamento_id);
create index if not exists tareas_fin_idx on public.tareas (fin) where deleted_at is null;
create index if not exists tareas_padre_idx on public.tareas (padre_id);

create table if not exists public.tarea_colaboradores (
  tarea_id    uuid not null references public.tareas(id) on delete cascade,
  empleado_id uuid not null references public.empleados(id) on delete restrict,
  primary key (tarea_id, empleado_id)
);
create index if not exists tarea_colab_empleado_idx on public.tarea_colaboradores (empleado_id);

create table if not exists public.tarea_checklist (
  id       uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  texto    text not null check (char_length(texto) between 1 and 200),
  hecho    boolean not null default false,
  orden    int not null default 0
);
create index if not exists tarea_checklist_tarea_idx on public.tarea_checklist (tarea_id);

create table if not exists public.tarea_comentarios (
  id         uuid primary key default gen_random_uuid(),
  tarea_id   uuid not null references public.tareas(id) on delete cascade,
  autor_id   uuid references public.empleados(id) on delete set null,
  texto      text not null check (char_length(texto) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists tarea_comentarios_tarea_idx on public.tarea_comentarios (tarea_id, created_at);

create table if not exists public.tarea_dependencias (
  tarea_id   uuid not null references public.tareas(id) on delete cascade,
  depende_de uuid not null references public.tareas(id) on delete cascade,
  primary key (tarea_id, depende_de),
  check (tarea_id <> depende_de)
);

create or replace function app.es_colaborador(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tarea_colaboradores c where c.tarea_id = tid and c.empleado_id = app.mi_empleado_id());
$$;

create or replace function app.gestiona_tarea(depto uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (app.tiene_permiso('tareas.gestionar')
    and (app.tiene_permiso('tareas.ver_todas') or depto = any(app.mis_departamentos())));
$$;

create or replace function app.puede_editar_tarea(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tareas t where t.id = tid and (
    public.is_admin() or t.responsable_id = app.mi_empleado_id() or t.creado_por = app.mi_empleado_id()
    or app.es_colaborador(t.id) or app.gestiona_tarea(t.departamento_id)));
$$;

-- Reglas de negocio: fechas de cierre, progreso y reasignación solo por quien gestiona
create or replace function app.tareas_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(new.creado_por, app.mi_empleado_id());
  elsif auth.uid() is not null and not app.gestiona_tarea(old.departamento_id) and (
        new.responsable_id is distinct from old.responsable_id
     or new.departamento_id is distinct from old.departamento_id
     or new.creado_por is distinct from old.creado_por) then
    raise exception 'Solo quien gestiona el departamento puede reasignar la actividad' using errcode = '42501';
  end if;
  if new.estado = 'completada' then
    new.completada_at := coalesce(new.completada_at, now());
    new.progreso := 100;
  else
    new.completada_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tareas_guard on public.tareas;
create trigger tareas_guard before insert or update on public.tareas for each row execute function app.tareas_guard();

create or replace function app.dependencias_sin_ciclo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    with recursive cadena as (
      select d.depende_de as id from public.tarea_dependencias d where d.tarea_id = new.depende_de
      union select d.depende_de from public.tarea_dependencias d join cadena c on d.tarea_id = c.id
    ) select 1 from cadena where id = new.tarea_id
  ) or new.depende_de = new.tarea_id then
    raise exception 'La dependencia crearía un ciclo' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists tarea_dependencias_ciclo on public.tarea_dependencias;
create trigger tarea_dependencias_ciclo before insert or update on public.tarea_dependencias
  for each row execute function app.dependencias_sin_ciclo();

-- ── CRM ──────────────────────────────────────────────────────────────
create table if not exists public.oportunidades (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null check (char_length(titulo) between 1 and 200),
  contacto_id       uuid references public.contactos(id) on delete set null,
  cliente_id        uuid references public.clientes(id) on delete set null,
  responsable_id    uuid references public.empleados(id) on delete set null,
  etapa             text not null default 'nuevo'
                    check (etapa in ('nuevo', 'contactado', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido')),
  valor             numeric(14,2) not null default 0 check (valor >= 0),
  moneda            text not null default 'USD',
  probabilidad      smallint not null default 10 check (probabilidad between 0 and 100),
  fuente            text,
  cierre_estimado   date,
  cerrada_at        timestamptz,
  motivo_perdida    text,
  proyecto_id       uuid references public.proyectos(id) on delete set null,
  orden             double precision not null default extract(epoch from now()),
  descripcion       text,
  creado_por        uuid references public.empleados(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists oportunidades_etapa_idx on public.oportunidades (etapa, orden) where deleted_at is null;
create index if not exists oportunidades_resp_idx on public.oportunidades (responsable_id);

create table if not exists public.crm_interacciones (
  id             uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references public.oportunidades(id) on delete cascade,
  contacto_id    uuid references public.contactos(id) on delete cascade,
  tipo           text not null check (tipo in ('llamada', 'correo', 'reunion', 'whatsapp', 'nota')),
  resumen        text not null check (char_length(resumen) between 1 and 2000),
  fecha          timestamptz not null default now(),
  recordatorio   timestamptz,
  hecho          boolean not null default false,
  autor_id       uuid references public.empleados(id) on delete set null,
  created_at     timestamptz not null default now(),
  check (oportunidad_id is not null or contacto_id is not null)
);
create index if not exists crm_inter_op_idx on public.crm_interacciones (oportunidad_id, fecha desc);
create index if not exists crm_inter_rec_idx on public.crm_interacciones (recordatorio) where not hecho;

create or replace function app.oportunidad_cierre() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.etapa in ('ganado', 'perdido') then
    new.cerrada_at := coalesce(new.cerrada_at, now());
    if new.etapa = 'ganado' then new.probabilidad := 100; else new.probabilidad := 0; end if;
  else
    new.cerrada_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists oportunidades_cierre on public.oportunidades;
create trigger oportunidades_cierre before insert or update on public.oportunidades for each row execute function app.oportunidad_cierre();

-- ── Finanzas internas (el ledger "movimientos" de clientes no se toca) ─
create table if not exists public.facturas (
  id                uuid primary key default gen_random_uuid(),
  numero            text not null,
  tipo              text not null check (tipo in ('emitida', 'recibida')),  -- por cobrar / por pagar
  cliente_id        uuid references public.clientes(id) on delete restrict,
  contacto_id       uuid references public.contactos(id) on delete restrict,  -- proveedor
  proyecto_id       uuid references public.proyectos(id) on delete set null,
  fecha_emision     date not null default current_date,
  fecha_vencimiento date,
  moneda            text not null default 'USD',
  subtotal          numeric(14,2) not null check (subtotal >= 0),
  impuesto          numeric(14,2) not null default 0 check (impuesto >= 0),
  total             numeric(14,2) generated always as (subtotal + impuesto) stored,
  pagado            numeric(14,2) not null default 0 check (pagado >= 0),
  estado            text not null default 'emitida' check (estado in ('borrador', 'emitida', 'parcial', 'pagada', 'anulada')),
  concepto          text,
  creado_por        uuid references public.empleados(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tipo, numero),
  check (fecha_vencimiento is null or fecha_vencimiento >= fecha_emision),
  check (tipo <> 'emitida' or cliente_id is not null or contacto_id is not null),
  check (tipo <> 'recibida' or contacto_id is not null)
);
create index if not exists facturas_estado_idx on public.facturas (tipo, estado);
create index if not exists facturas_proyecto_idx on public.facturas (proyecto_id);

-- Pagos de facturas: solo inserción (inmutables)
create table if not exists public.pagos_factura (
  id         uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas(id) on delete restrict,
  fecha      date not null default current_date,
  monto      numeric(14,2) not null check (monto > 0),
  metodo     text,
  referencia text,
  creado_por uuid references public.empleados(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pagos_factura_idx on public.pagos_factura (factura_id);

create or replace function app.aplicar_pago() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f public.facturas;
begin
  select * into f from public.facturas where id = new.factura_id for update;
  if f.estado in ('anulada', 'borrador') then
    raise exception 'No se pueden registrar pagos en una factura %', f.estado using errcode = '23514';
  end if;
  if f.pagado + new.monto > f.total then
    raise exception 'El pago excede el saldo pendiente (%)', f.total - f.pagado using errcode = '23514';
  end if;
  new.creado_por := coalesce(new.creado_por, app.mi_empleado_id());
  update public.facturas set pagado = pagado + new.monto,
    estado = case when pagado + new.monto >= total then 'pagada' else 'parcial' end, updated_at = now()
  where id = f.id;
  return new;
end $$;
drop trigger if exists pagos_factura_aplicar on public.pagos_factura;
create trigger pagos_factura_aplicar before insert on public.pagos_factura for each row execute function app.aplicar_pago();

create or replace function app.inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro financiero inmutable: registra un ajuste en su lugar' using errcode = '42501';
end $$;
drop trigger if exists pagos_factura_inmutable on public.pagos_factura;
create trigger pagos_factura_inmutable before update or delete on public.pagos_factura for each row execute function app.inmutable();

-- Facturas: montos fijos una vez emitidas; "pagado" solo lo mueve el trigger de pagos
create or replace function app.facturas_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.estado <> 'borrador' then raise exception 'Solo se eliminan borradores; anula la factura' using errcode = '42501'; end if;
    return old;
  end if;
  if old.estado <> 'borrador' and (new.subtotal, new.impuesto, new.tipo, new.moneda) is distinct from (old.subtotal, old.impuesto, old.tipo, old.moneda) then
    raise exception 'Los montos de una factura emitida no se modifican' using errcode = '42501';
  end if;
  if new.pagado is distinct from old.pagado and pg_trigger_depth() < 2 then
    raise exception 'El monto pagado se actualiza registrando pagos' using errcode = '42501';
  end if;
  if old.estado = 'anulada' and new.estado <> 'anulada' then
    raise exception 'Una factura anulada no se reactiva' using errcode = '42501';
  end if;
  if new.estado = 'anulada' and old.pagado > 0 then
    raise exception 'No se anula una factura con pagos registrados' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists facturas_guard on public.facturas;
create trigger facturas_guard before update or delete on public.facturas for each row execute function app.facturas_guard();

-- Ingresos y gastos directos. Se anulan (con motivo), nunca se editan ni borran.
create table if not exists public.finanzas_registros (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('ingreso', 'gasto')),
  categoria       text not null,
  descripcion     text not null check (char_length(descripcion) between 1 and 300),
  monto           numeric(14,2) not null check (monto > 0),
  moneda          text not null default 'USD',
  fecha           date not null default current_date,
  proyecto_id     uuid references public.proyectos(id) on delete set null,
  departamento_id uuid references public.departamentos(id) on delete set null,
  contacto_id     uuid references public.contactos(id) on delete set null,
  factura_id      uuid references public.facturas(id) on delete set null,
  anulado         boolean not null default false,
  motivo_anulacion text,
  creado_por      uuid references public.empleados(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (not anulado or motivo_anulacion is not null)
);
create index if not exists finanzas_fecha_idx on public.finanzas_registros (fecha desc);
create index if not exists finanzas_proyecto_idx on public.finanzas_registros (proyecto_id);

create or replace function app.registros_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Los registros financieros no se eliminan; anúlalos' using errcode = '42501'; end if;
  if old.anulado or (to_jsonb(new) - 'anulado' - 'motivo_anulacion') is distinct from (to_jsonb(old) - 'anulado' - 'motivo_anulacion') then
    raise exception 'Un registro financiero solo puede anularse' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists finanzas_registros_guard on public.finanzas_registros;
create trigger finanzas_registros_guard before update or delete on public.finanzas_registros
  for each row execute function app.registros_guard();

create table if not exists public.presupuestos_gestion (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  departamento_id uuid references public.departamentos(id) on delete restrict,
  proyecto_id     uuid references public.proyectos(id) on delete cascade,
  categoria       text,
  periodo_inicio  date not null,
  periodo_fin     date not null,
  monto           numeric(14,2) not null check (monto >= 0),
  moneda          text not null default 'USD',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (periodo_fin >= periodo_inicio)
);

-- ── Soporte técnico ──────────────────────────────────────────────────
create table if not exists public.tickets (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  titulo          text not null check (char_length(titulo) between 1 and 200),
  descripcion     text,
  cliente_id      uuid references public.clientes(id) on delete set null,
  solicitante_id  uuid references public.profiles(id) on delete set null,
  proyecto_id     uuid references public.proyectos(id) on delete set null,
  categoria       text,
  prioridad       text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  responsable_id  uuid references public.empleados(id) on delete set null,
  departamento_id uuid references public.departamentos(id) on delete set null,
  estado          text not null default 'abierto'
                  check (estado in ('abierto', 'asignado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado')),
  resuelto_at     timestamptz,
  cerrado_at      timestamptz,
  creado_por      uuid references public.empleados(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tickets_estado_idx on public.tickets (estado);
create index if not exists tickets_resp_idx on public.tickets (responsable_id);

create table if not exists public.ticket_comentarios (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  autor_id   uuid references public.empleados(id) on delete set null,
  texto      text not null check (char_length(texto) between 1 and 4000),
  interno    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ticket_comentarios_idx on public.ticket_comentarios (ticket_id, created_at);

create or replace function app.tickets_estado() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.creado_por := coalesce(new.creado_por, app.mi_empleado_id()); end if;
  if new.responsable_id is not null and new.estado = 'abierto' then new.estado := 'asignado'; end if;
  if new.estado in ('resuelto', 'cerrado') then new.resuelto_at := coalesce(new.resuelto_at, now());
  else new.resuelto_at := null; end if;
  if new.estado = 'cerrado' then new.cerrado_at := coalesce(new.cerrado_at, now()); else new.cerrado_at := null; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tickets_estado on public.tickets;
create trigger tickets_estado before insert or update on public.tickets for each row execute function app.tickets_estado();

create or replace function app.puede_ver_ticket(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tickets t where t.id = tid and (
    public.is_admin() or t.responsable_id = app.mi_empleado_id() or t.creado_por = app.mi_empleado_id()
    or t.solicitante_id = auth.uid() or app.tiene_permiso('tickets.ver_todos')
    or (app.tiene_permiso('tickets.ver_departamento') and t.departamento_id = any(app.mis_departamentos()))));
$$;

-- ── KPI ──────────────────────────────────────────────────────────────
create table if not exists public.kpis (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(nombre) between 2 and 120),
  departamento_id uuid references public.departamentos(id) on delete restrict,
  formula         text not null,
  meta            numeric(14,4),
  unidad          text not null default '%',
  sentido         text not null default 'mayor' check (sentido in ('mayor', 'menor')),  -- mayor/menor es mejor
  fuente          text,
  periodicidad    text not null default 'mensual' check (periodicidad in ('semanal', 'mensual', 'trimestral', 'anual')),
  responsable_id  uuid references public.empleados(id) on delete set null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (nombre, departamento_id)
);

create table if not exists public.kpi_mediciones (
  id             uuid primary key default gen_random_uuid(),
  kpi_id         uuid not null references public.kpis(id) on delete cascade,
  periodo        date not null,  -- inicio del período
  valor          numeric(14,4) not null,
  nota           text,
  registrado_por uuid references public.empleados(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (kpi_id, periodo)
);

-- ── Notificaciones, archivos y auditoría ─────────────────────────────
create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  titulo     text not null,
  cuerpo     text,
  enlace     text check (enlace is null or enlace ~ '^/gestion'),
  leida_at   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notificaciones_user_idx on public.notificaciones (profile_id, created_at desc);

create table if not exists public.archivos_gestion (
  id         uuid primary key default gen_random_uuid(),
  entidad    text not null check (entidad in ('tarea', 'proyecto', 'ticket', 'oportunidad', 'contacto', 'factura', 'empleado')),
  entidad_id uuid not null,
  nombre     text not null check (char_length(nombre) between 1 and 200),
  ruta       text not null unique,
  mime       text not null,
  tamano     int not null check (tamano > 0 and tamano <= 10485760),
  subido_por uuid references public.empleados(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists archivos_entidad_idx on public.archivos_gestion (entidad, entidad_id);

create table if not exists public.auditoria (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  accion     text not null check (accion in ('crear', 'actualizar', 'eliminar')),
  entidad    text not null,
  entidad_id text,
  cambios    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auditoria_entidad_idx on public.auditoria (entidad, entidad_id);
create index if not exists auditoria_fecha_idx on public.auditoria (created_at desc);

-- Registra qué cambió. Valores de datos personales y textos libres NO se guardan, solo el nombre del campo.
create or replace function app.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sensibles constant text[] := array['datos', 'email', 'email_corporativo', 'telefono', 'whatsapp', 'direccion',
    'descripcion', 'observaciones', 'texto', 'notas', 'comentarios', 'resumen', 'avatar_url', 'full_name', 'nombre', 'apellido'];
  viejo jsonb; nuevo jsonb; k text; dif jsonb := '{}'::jsonb; rid text;
begin
  if tg_op = 'DELETE' then viejo := to_jsonb(old); rid := viejo->>'id';
  elsif tg_op = 'INSERT' then nuevo := to_jsonb(new); rid := nuevo->>'id';
  else
    viejo := to_jsonb(old); nuevo := to_jsonb(new); rid := nuevo->>'id';
    for k in select jsonb_object_keys(nuevo) loop
      continue when k in ('updated_at', 'orden');
      if nuevo->k is distinct from viejo->k then
        dif := dif || jsonb_build_object(k, case when k = any(sensibles) then '"(modificado)"'::jsonb
                                             else jsonb_build_object('de', viejo->k, 'a', nuevo->k) end);
      end if;
    end loop;
    if dif = '{}'::jsonb then return new; end if;
  end if;
  insert into public.auditoria (actor_id, accion, entidad, entidad_id, cambios)
  values (auth.uid(), case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'actualizar' else 'eliminar' end,
          tg_table_name, rid, nullif(dif, '{}'::jsonb));
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['departamentos', 'cargos', 'empleados', 'asignaciones_permiso', 'proyectos', 'proyecto_equipo',
    'tareas', 'tarea_colaboradores', 'contactos', 'clientes', 'oportunidades', 'facturas', 'pagos_factura',
    'finanzas_registros', 'presupuestos_gestion', 'tickets', 'kpis', 'kpi_mediciones', 'movimientos', 'profiles',
    'catalogos', 'parametros', 'empleado_evaluaciones', 'archivos_gestion'] loop
    execute format('drop trigger if exists auditoria on public.%I', t);
    execute format('create trigger auditoria after insert or update or delete on public.%I for each row execute function app.auditar()', t);
  end loop;
end $$;

-- Notificaciones automáticas por asignación y comentarios
create or replace function app.notificar(emp uuid, titulo text, cuerpo text, enlace text) returns void
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  select profile_id into pid from public.empleados where id = emp and estado = 'activo';
  if pid is not null and pid is distinct from auth.uid() then
    insert into public.notificaciones (profile_id, titulo, cuerpo, enlace) values (pid, titulo, cuerpo, enlace);
  end if;
end $$;

create or replace function app.notificar_asignacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.responsable_id is not null and (tg_op = 'INSERT' or new.responsable_id is distinct from old.responsable_id) then
    if tg_table_name = 'tareas' then
      perform app.notificar(new.responsable_id, 'Nueva actividad asignada', new.titulo, '/gestion/actividades?tarea=' || new.id);
    else
      perform app.notificar(new.responsable_id, 'Ticket asignado #' || new.numero, new.titulo, '/gestion/soporte?ticket=' || new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tareas_notificar on public.tareas;
create trigger tareas_notificar after insert or update of responsable_id on public.tareas for each row execute function app.notificar_asignacion();
drop trigger if exists tickets_notificar on public.tickets;
create trigger tickets_notificar after insert or update of responsable_id on public.tickets for each row execute function app.notificar_asignacion();

create or replace function app.notificar_comentario() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select id, titulo, responsable_id into t from public.tareas where id = new.tarea_id;
  if t.responsable_id is not null and t.responsable_id is distinct from new.autor_id then
    perform app.notificar(t.responsable_id, 'Nuevo comentario', t.titulo, '/gestion/actividades?tarea=' || t.id);
  end if;
  return new;
end $$;
drop trigger if exists tarea_comentarios_notificar on public.tarea_comentarios;
create trigger tarea_comentarios_notificar after insert on public.tarea_comentarios for each row execute function app.notificar_comentario();

-- updated_at genérico
create or replace function app.touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['departamentos', 'cargos', 'empleados', 'contactos', 'proyecto_items', 'presupuestos_gestion', 'kpis'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function app.touch()', t);
  end loop;
end $$;

-- Empleados: rol interno, enlace de cuenta y estado laboral solo los cambia el admin
-- (la desvinculación la ejecuta la API con service role tras verificar permisos)
create or replace function app.empleados_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.rol_interno <> 'empleado' or new.profile_id is not null or new.estado <> 'activo' then
      raise exception 'Solo el administrador asigna roles internos y accesos' using errcode = '42501';
    end if;
  elsif (new.rol_interno, new.profile_id, new.estado, new.deleted_at) is distinct from (old.rol_interno, old.profile_id, old.estado, old.deleted_at) then
    raise exception 'Solo el administrador cambia rol, acceso o estado laboral' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists empleados_guard on public.empleados;
create trigger empleados_guard before insert or update on public.empleados for each row execute function app.empleados_guard();

-- Archivos: visibles si la entidad es visible para quien consulta (RLS de la entidad)
create or replace function app.puede_ver_entidad(ent text, eid uuid) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
begin
  return case ent
    when 'tarea'       then exists (select 1 from public.tareas where id = eid)
    when 'proyecto'    then exists (select 1 from public.proyectos where id = eid)
    when 'ticket'      then exists (select 1 from public.tickets where id = eid)
    when 'oportunidad' then exists (select 1 from public.oportunidades where id = eid)
    when 'contacto'    then exists (select 1 from public.contactos where id = eid)
    when 'factura'     then exists (select 1 from public.facturas where id = eid)
    when 'empleado'    then eid = app.mi_empleado_id() or app.tiene_permiso('empleados.gestionar')
    else false end;
end $$;

-- ════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════
do $$ declare t text; begin
  foreach t in array array['departamentos', 'cargos', 'empleados', 'empleado_datos', 'empleado_evaluaciones', 'permisos',
    'asignaciones_permiso', 'catalogos', 'parametros', 'proyecto_equipo', 'proyecto_hitos', 'proyecto_items', 'contactos',
    'proyecto_contactos', 'tareas', 'tarea_colaboradores', 'tarea_checklist', 'tarea_comentarios', 'tarea_dependencias',
    'oportunidades', 'crm_interacciones', 'facturas', 'pagos_factura', 'finanzas_registros', 'presupuestos_gestion',
    'tickets', 'ticket_comentarios', 'kpis', 'kpi_mediciones', 'notificaciones', 'archivos_gestion', 'auditoria'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
grant usage on sequence public.proyectos_codigo_seq to authenticated;

-- Catálogos de organización: lectura del personal, escritura solo admin
do $$ declare t text; begin
  foreach t in array array['departamentos', 'cargos', 'permisos', 'catalogos', 'parametros'] loop
    execute format('drop policy if exists "%s_staff_select" on public.%I', t, t);
    execute format('create policy "%s_staff_select" on public.%I for select to authenticated using ((select app.es_staff()))', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
  end loop;
end $$;

drop policy if exists "asignaciones_select" on public.asignaciones_permiso;
create policy "asignaciones_select" on public.asignaciones_permiso for select to authenticated using ((select public.is_admin()));
drop policy if exists "asignaciones_admin_write" on public.asignaciones_permiso;
create policy "asignaciones_admin_write" on public.asignaciones_permiso for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Empleados: directorio visible al personal; gestión por Talento Humano / admin
drop policy if exists "empleados_select" on public.empleados;
create policy "empleados_select" on public.empleados for select to authenticated using ((select app.es_staff()));
drop policy if exists "empleados_insert" on public.empleados;
create policy "empleados_insert" on public.empleados for insert to authenticated
  with check ((select app.tiene_permiso('empleados.gestionar')));
drop policy if exists "empleados_update" on public.empleados;
create policy "empleados_update" on public.empleados for update to authenticated
  using ((select app.tiene_permiso('empleados.gestionar'))) with check ((select app.tiene_permiso('empleados.gestionar')));
drop policy if exists "empleados_delete" on public.empleados;
create policy "empleados_delete" on public.empleados for delete to authenticated using ((select public.is_admin()));

drop policy if exists "empleado_datos_select" on public.empleado_datos;
create policy "empleado_datos_select" on public.empleado_datos for select to authenticated
  using (empleado_id = (select app.mi_empleado_id()) or (select app.tiene_permiso('empleados.gestionar')));
drop policy if exists "empleado_datos_write" on public.empleado_datos;
create policy "empleado_datos_write" on public.empleado_datos for all to authenticated
  using (empleado_id = (select app.mi_empleado_id()) or (select app.tiene_permiso('empleados.gestionar')))
  with check (empleado_id = (select app.mi_empleado_id()) or (select app.tiene_permiso('empleados.gestionar')));

drop policy if exists "evaluaciones_select" on public.empleado_evaluaciones;
create policy "evaluaciones_select" on public.empleado_evaluaciones for select to authenticated
  using (empleado_id = (select app.mi_empleado_id()) or (select app.tiene_permiso('empleados.gestionar')));
drop policy if exists "evaluaciones_insert" on public.empleado_evaluaciones;
create policy "evaluaciones_insert" on public.empleado_evaluaciones for insert to authenticated
  with check ((select app.tiene_permiso('empleados.gestionar')) and empleado_id <> coalesce((select app.mi_empleado_id()), '00000000-0000-0000-0000-000000000000'));

-- Clientes: se cierra la lectura a cualquier usuario autenticado (antes los clientes podían listar a todos)
drop policy if exists "clientes_select" on public.clientes;
create policy "clientes_select" on public.clientes for select to authenticated
  using ((select public.is_admin()) or (select app.tiene_permiso('clientes.ver')));
drop policy if exists "clientes_staff_write" on public.clientes;
create policy "clientes_staff_write" on public.clientes for insert to authenticated with check ((select app.tiene_permiso('clientes.gestionar')));
drop policy if exists "clientes_staff_update" on public.clientes;
create policy "clientes_staff_update" on public.clientes for update to authenticated
  using ((select app.tiene_permiso('clientes.gestionar'))) with check ((select app.tiene_permiso('clientes.gestionar')));

-- Proyectos: se suman políticas para el personal (las de cliente/admin existentes siguen igual)
drop policy if exists "proyectos_staff_select" on public.proyectos;
create policy "proyectos_staff_select" on public.proyectos for select to authenticated using (
  (select app.tiene_permiso('proyectos.ver_todos'))
  or ((select app.tiene_permiso('proyectos.ver_departamento')) and departamento_id in (select unnest(app.mis_departamentos())))
  or app.en_equipo(id)
  or exists (select 1 from public.tareas t where t.proyecto_id = proyectos.id and t.responsable_id = (select app.mi_empleado_id())));
drop policy if exists "proyectos_staff_insert" on public.proyectos;
create policy "proyectos_staff_insert" on public.proyectos for insert to authenticated with check (
  (select app.tiene_permiso('proyectos.gestionar')) and ((select app.tiene_permiso('proyectos.ver_todos'))
    or departamento_id in (select unnest(app.mis_departamentos()))));
drop policy if exists "proyectos_staff_update" on public.proyectos;
create policy "proyectos_staff_update" on public.proyectos for update to authenticated
  using ((select app.tiene_permiso('proyectos.gestionar')) and ((select app.tiene_permiso('proyectos.ver_todos'))
    or departamento_id in (select unnest(app.mis_departamentos())) or coordinador_id = (select app.mi_empleado_id())))
  with check ((select app.tiene_permiso('proyectos.gestionar')) and ((select app.tiene_permiso('proyectos.ver_todos'))
    or departamento_id in (select unnest(app.mis_departamentos())) or coordinador_id = (select app.mi_empleado_id())));

-- Hijos del expediente: visibles si el proyecto es visible; escritura con proyectos.gestionar o el equipo
do $$ declare t text; begin
  foreach t in array array['proyecto_equipo', 'proyecto_hitos', 'proyecto_items', 'proyecto_contactos'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using ((select app.es_staff()) and exists (select 1 from public.proyectos p where p.id = proyecto_id))', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated
      using ((select app.es_staff()) and ((select app.tiene_permiso(''proyectos.gestionar'')) or app.en_equipo(proyecto_id)) and exists (select 1 from public.proyectos p where p.id = proyecto_id))
      with check ((select app.es_staff()) and ((select app.tiene_permiso(''proyectos.gestionar'')) or app.en_equipo(proyecto_id)) and exists (select 1 from public.proyectos p where p.id = proyecto_id))', t, t);
  end loop;
end $$;
-- El equipo del proyecto solo lo define quien gestiona proyectos
drop policy if exists "proyecto_equipo_write" on public.proyecto_equipo;
create policy "proyecto_equipo_write" on public.proyecto_equipo for all to authenticated
  using ((select app.tiene_permiso('proyectos.gestionar')) and exists (select 1 from public.proyectos p where p.id = proyecto_id))
  with check ((select app.tiene_permiso('proyectos.gestionar')) and exists (select 1 from public.proyectos p where p.id = proyecto_id));

-- Observaciones existentes: el personal con acceso al proyecto también las lee
drop policy if exists "observaciones_staff_select" on public.proyecto_observaciones;
create policy "observaciones_staff_select" on public.proyecto_observaciones for select to authenticated
  using ((select app.es_staff()) and exists (select 1 from public.proyectos p where p.id = proyecto_id));

-- Contactos
drop policy if exists "contactos_select" on public.contactos;
create policy "contactos_select" on public.contactos for select to authenticated using ((select app.tiene_permiso('contactos.ver')));
drop policy if exists "contactos_insert" on public.contactos;
create policy "contactos_insert" on public.contactos for insert to authenticated with check ((select app.tiene_permiso('contactos.gestionar')));
drop policy if exists "contactos_update" on public.contactos;
create policy "contactos_update" on public.contactos for update to authenticated
  using ((select app.tiene_permiso('contactos.gestionar'))) with check ((select app.tiene_permiso('contactos.gestionar')));
drop policy if exists "contactos_delete" on public.contactos;
create policy "contactos_delete" on public.contactos for delete to authenticated using ((select public.is_admin()));

-- Tareas
drop policy if exists "tareas_select" on public.tareas;
create policy "tareas_select" on public.tareas for select to authenticated using (
  (select public.is_admin())
  or responsable_id = (select app.mi_empleado_id()) or creado_por = (select app.mi_empleado_id())
  or app.es_colaborador(id)
  or (select app.tiene_permiso('tareas.ver_todas'))
  or ((select app.tiene_permiso('tareas.ver_departamento')) and departamento_id in (select unnest(app.mis_departamentos())))
  or (proyecto_id is not null and app.en_equipo(proyecto_id)));
drop policy if exists "tareas_insert" on public.tareas;
create policy "tareas_insert" on public.tareas for insert to authenticated with check (
  (select app.es_staff()) and (responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(departamento_id)));
drop policy if exists "tareas_update" on public.tareas;
create policy "tareas_update" on public.tareas for update to authenticated
  using (app.puede_editar_tarea(id))
  with check ((select app.es_staff()) and (responsable_id = (select app.mi_empleado_id()) or app.es_colaborador(id)
    or creado_por = (select app.mi_empleado_id()) or app.gestiona_tarea(departamento_id)));
drop policy if exists "tareas_delete" on public.tareas;
create policy "tareas_delete" on public.tareas for delete to authenticated using ((select public.is_admin()));

do $$ declare t text; begin
  foreach t in array array['tarea_checklist', 'tarea_dependencias'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (exists (select 1 from public.tareas x where x.id = tarea_id))', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated using (app.puede_editar_tarea(tarea_id)) with check (app.puede_editar_tarea(tarea_id))', t, t);
  end loop;
end $$;
drop policy if exists "tarea_colaboradores_select" on public.tarea_colaboradores;
create policy "tarea_colaboradores_select" on public.tarea_colaboradores for select to authenticated
  using (exists (select 1 from public.tareas x where x.id = tarea_id));
drop policy if exists "tarea_colaboradores_write" on public.tarea_colaboradores;
create policy "tarea_colaboradores_write" on public.tarea_colaboradores for all to authenticated
  using (exists (select 1 from public.tareas x where x.id = tarea_id and (x.responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(x.departamento_id))))
  with check (exists (select 1 from public.tareas x where x.id = tarea_id and (x.responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(x.departamento_id))));
drop policy if exists "tarea_comentarios_select" on public.tarea_comentarios;
create policy "tarea_comentarios_select" on public.tarea_comentarios for select to authenticated
  using (exists (select 1 from public.tareas x where x.id = tarea_id));
drop policy if exists "tarea_comentarios_insert" on public.tarea_comentarios;
create policy "tarea_comentarios_insert" on public.tarea_comentarios for insert to authenticated
  with check (autor_id = (select app.mi_empleado_id()) and exists (select 1 from public.tareas x where x.id = tarea_id));

-- CRM
drop policy if exists "oportunidades_select" on public.oportunidades;
create policy "oportunidades_select" on public.oportunidades for select to authenticated
  using ((select app.tiene_permiso('crm.ver')) or responsable_id = (select app.mi_empleado_id()));
drop policy if exists "oportunidades_insert" on public.oportunidades;
create policy "oportunidades_insert" on public.oportunidades for insert to authenticated with check ((select app.tiene_permiso('crm.gestionar')));
drop policy if exists "oportunidades_update" on public.oportunidades;
create policy "oportunidades_update" on public.oportunidades for update to authenticated
  using ((select app.tiene_permiso('crm.gestionar')) or responsable_id = (select app.mi_empleado_id()))
  with check ((select app.tiene_permiso('crm.gestionar')) or responsable_id = (select app.mi_empleado_id()));
drop policy if exists "crm_inter_select" on public.crm_interacciones;
create policy "crm_inter_select" on public.crm_interacciones for select to authenticated
  using ((select app.tiene_permiso('crm.ver')) or autor_id = (select app.mi_empleado_id())
    or exists (select 1 from public.oportunidades o where o.id = oportunidad_id));
drop policy if exists "crm_inter_insert" on public.crm_interacciones;
create policy "crm_inter_insert" on public.crm_interacciones for insert to authenticated
  with check (autor_id = (select app.mi_empleado_id()) and ((select app.tiene_permiso('crm.gestionar'))
    or exists (select 1 from public.oportunidades o where o.id = oportunidad_id and o.responsable_id = (select app.mi_empleado_id()))));
drop policy if exists "crm_inter_update" on public.crm_interacciones;
create policy "crm_inter_update" on public.crm_interacciones for update to authenticated
  using (autor_id = (select app.mi_empleado_id()) or (select public.is_admin()))
  with check (autor_id = (select app.mi_empleado_id()) or (select public.is_admin()));

-- Finanzas (sin políticas DELETE salvo borradores de facturas: el trigger lo impide en lo demás)
do $$ declare t text; begin
  foreach t in array array['facturas', 'pagos_factura', 'finanzas_registros', 'presupuestos_gestion'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using ((select app.tiene_permiso(''finanzas.ver'')))', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('create policy "%s_insert" on public.%I for insert to authenticated with check ((select app.tiene_permiso(''finanzas.gestionar'')))', t, t);
  end loop;
  foreach t in array array['facturas', 'finanzas_registros', 'presupuestos_gestion'] loop
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('create policy "%s_update" on public.%I for update to authenticated using ((select app.tiene_permiso(''finanzas.gestionar''))) with check ((select app.tiene_permiso(''finanzas.gestionar'')))', t, t);
  end loop;
end $$;
drop policy if exists "facturas_delete" on public.facturas;
create policy "facturas_delete" on public.facturas for delete to authenticated using ((select app.tiene_permiso('finanzas.gestionar')) and estado = 'borrador');
drop policy if exists "presupuestos_gestion_delete" on public.presupuestos_gestion;
create policy "presupuestos_gestion_delete" on public.presupuestos_gestion for delete to authenticated using ((select public.is_admin()));
-- Ledger de billetera de clientes: solo lectura para Finanzas
drop policy if exists "movimientos_finanzas_select" on public.movimientos;
create policy "movimientos_finanzas_select" on public.movimientos for select to authenticated using ((select app.tiene_permiso('finanzas.ver')));

-- Tickets
drop policy if exists "tickets_select" on public.tickets;
create policy "tickets_select" on public.tickets for select to authenticated using (app.puede_ver_ticket(id));
drop policy if exists "tickets_insert" on public.tickets;
create policy "tickets_insert" on public.tickets for insert to authenticated with check ((select app.es_staff()));
drop policy if exists "tickets_update" on public.tickets;
create policy "tickets_update" on public.tickets for update to authenticated
  using (app.puede_ver_ticket(id) and ((select app.tiene_permiso('tickets.gestionar')) or responsable_id = (select app.mi_empleado_id())))
  with check ((select app.tiene_permiso('tickets.gestionar')) or responsable_id = (select app.mi_empleado_id()));
drop policy if exists "ticket_com_select" on public.ticket_comentarios;
create policy "ticket_com_select" on public.ticket_comentarios for select to authenticated using (app.puede_ver_ticket(ticket_id));
drop policy if exists "ticket_com_insert" on public.ticket_comentarios;
create policy "ticket_com_insert" on public.ticket_comentarios for insert to authenticated
  with check (autor_id = (select app.mi_empleado_id()) and app.puede_ver_ticket(ticket_id));

-- KPI
drop policy if exists "kpis_select" on public.kpis;
create policy "kpis_select" on public.kpis for select to authenticated using ((select app.tiene_permiso('kpi.ver')));
drop policy if exists "kpis_write" on public.kpis;
create policy "kpis_write" on public.kpis for all to authenticated
  using ((select app.tiene_permiso('kpi.gestionar'))) with check ((select app.tiene_permiso('kpi.gestionar')));
drop policy if exists "kpi_med_select" on public.kpi_mediciones;
create policy "kpi_med_select" on public.kpi_mediciones for select to authenticated using ((select app.tiene_permiso('kpi.ver')));
drop policy if exists "kpi_med_write" on public.kpi_mediciones;
create policy "kpi_med_write" on public.kpi_mediciones for all to authenticated
  using ((select app.tiene_permiso('kpi.gestionar')) or exists (select 1 from public.kpis k where k.id = kpi_id and k.responsable_id = (select app.mi_empleado_id())))
  with check ((select app.tiene_permiso('kpi.gestionar')) or exists (select 1 from public.kpis k where k.id = kpi_id and k.responsable_id = (select app.mi_empleado_id())));

-- Notificaciones: cada quien las suyas (las crean triggers/servidor)
drop policy if exists "notificaciones_select" on public.notificaciones;
create policy "notificaciones_select" on public.notificaciones for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "notificaciones_update" on public.notificaciones;
create policy "notificaciones_update" on public.notificaciones for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Archivos
drop policy if exists "archivos_select" on public.archivos_gestion;
create policy "archivos_select" on public.archivos_gestion for select to authenticated
  using ((select app.es_staff()) and app.puede_ver_entidad(entidad, entidad_id));
drop policy if exists "archivos_insert" on public.archivos_gestion;
create policy "archivos_insert" on public.archivos_gestion for insert to authenticated
  with check (subido_por = (select app.mi_empleado_id()) and app.puede_ver_entidad(entidad, entidad_id));
drop policy if exists "archivos_delete" on public.archivos_gestion;
create policy "archivos_delete" on public.archivos_gestion for delete to authenticated
  using (subido_por = (select app.mi_empleado_id()) or (select public.is_admin()));

-- Auditoría: solo lectura (la escribe el trigger)
drop policy if exists "auditoria_select" on public.auditoria;
create policy "auditoria_select" on public.auditoria for select to authenticated using ((select app.tiene_permiso('auditoria.ver')));

-- Funciones: ejecutables solo por usuarios autenticados
revoke execute on all functions in schema app from public;
grant execute on all functions in schema app to authenticated, service_role;

-- Bucket privado para archivos de gestión (descarga con URL firmada desde la API)
insert into storage.buckets (id, name, public, file_size_limit)
values ('gestion', 'gestion', false, 10485760) on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- Datos base (estructura organizacional y catálogos; sin datos ficticios)
-- ════════════════════════════════════════════════════════════════════
insert into public.departamentos (codigo, nombre, orden) values ('DG', 'Dirección General', 0) on conflict (codigo) do nothing;
insert into public.departamentos (codigo, nombre, orden, padre_id)
select v.codigo, v.nombre, v.orden, (select id from public.departamentos where codigo = 'DG') from (values
  ('COM', 'Comercialización', 1), ('CONS', 'Consultoría Funcional', 2), ('LEG', 'Legal', 3),
  ('TEC', 'Tecnología / DevOps y Desarrollo', 4), ('ADMFIN', 'Administración y Finanzas', 5), ('TH', 'Talento Humano', 6)
) as v(codigo, nombre, orden) on conflict (codigo) do nothing;
insert into public.departamentos (codigo, nombre, orden, padre_id)
select v.codigo, v.nombre, v.orden, (select id from public.departamentos where codigo = v.padre) from (values
  ('VEN', 'Ventas', 1, 'COM'), ('MKT', 'Marketing', 2, 'COM'), ('CRM', 'CRM', 3, 'COM'),
  ('CFUN', 'Consultores funcionales', 1, 'CONS'), ('IMPL', 'Implementación', 2, 'CONS'),
  ('CONT', 'Contratos', 1, 'LEG'), ('APLEG', 'Apoyo legal', 2, 'LEG'),
  ('ARQ', 'Arquitectura', 1, 'TEC'), ('FE', 'Frontend', 2, 'TEC'), ('BE', 'Backend', 3, 'TEC'),
  ('FS', 'Full Stack', 4, 'TEC'), ('DEVOPS', 'DevOps / CI-CD', 5, 'TEC'), ('QA', 'QA / Calidad', 6, 'TEC'),
  ('ADM', 'Administración', 1, 'ADMFIN'), ('CONTA', 'Contaduría', 2, 'ADMFIN'),
  ('RECL', 'Reclutamiento', 1, 'TH'), ('PSIC', 'Psicología Organizacional', 2, 'TH'), ('RRHH', 'Recursos Humanos', 3, 'TH')
) as v(codigo, nombre, orden, padre) on conflict (codigo) do nothing;

insert into public.permisos (codigo, modulo, descripcion) values
  ('empleados.ver', 'Talento Humano', 'Ver el directorio de empleados'),
  ('empleados.gestionar', 'Talento Humano', 'Crear y editar expedientes, evaluaciones y desvinculaciones'),
  ('proyectos.ver_departamento', 'Proyectos', 'Ver los proyectos de sus departamentos'),
  ('proyectos.ver_todos', 'Proyectos', 'Ver todos los proyectos'),
  ('proyectos.gestionar', 'Proyectos', 'Crear y editar proyectos a su alcance'),
  ('tareas.ver_departamento', 'Actividades', 'Ver las actividades de sus departamentos'),
  ('tareas.ver_todas', 'Actividades', 'Ver todas las actividades'),
  ('tareas.gestionar', 'Actividades', 'Asignar y reasignar actividades a su alcance'),
  ('contactos.ver', 'Contactos', 'Ver el directorio de contactos'),
  ('contactos.gestionar', 'Contactos', 'Crear y editar contactos'),
  ('clientes.ver', 'Clientes', 'Ver clientes'),
  ('clientes.gestionar', 'Clientes', 'Crear y editar clientes'),
  ('crm.ver', 'CRM', 'Ver todo el pipeline comercial'),
  ('crm.gestionar', 'CRM', 'Crear y mover oportunidades'),
  ('finanzas.ver', 'Finanzas', 'Ver facturas, pagos, ingresos, gastos y reportes'),
  ('finanzas.gestionar', 'Finanzas', 'Registrar facturas, pagos, ingresos, gastos y presupuestos'),
  ('tickets.ver_departamento', 'Soporte', 'Ver tickets de sus departamentos'),
  ('tickets.ver_todos', 'Soporte', 'Ver todos los tickets'),
  ('tickets.gestionar', 'Soporte', 'Asignar y cambiar el estado de tickets'),
  ('kpi.ver', 'KPI', 'Ver indicadores'),
  ('kpi.gestionar', 'KPI', 'Definir indicadores y registrar mediciones'),
  ('estadisticas.ver', 'Estadísticas', 'Ver estadísticas de la empresa'),
  ('auditoria.ver', 'Configuración', 'Consultar la auditoría')
on conflict (codigo) do nothing;

insert into public.asignaciones_permiso (sujeto_tipo, sujeto_id, permiso)
select 'rol', r, p from (values
  ('coordinador', 'empleados.ver'), ('coordinador', 'proyectos.ver_departamento'), ('coordinador', 'proyectos.gestionar'),
  ('coordinador', 'tareas.ver_departamento'), ('coordinador', 'tareas.gestionar'), ('coordinador', 'contactos.ver'),
  ('coordinador', 'tickets.ver_departamento'), ('coordinador', 'tickets.gestionar'), ('coordinador', 'kpi.ver'),
  ('coordinador', 'kpi.gestionar'), ('coordinador', 'estadisticas.ver'),
  ('supervisor', 'empleados.ver'), ('supervisor', 'proyectos.ver_departamento'), ('supervisor', 'tareas.ver_departamento'),
  ('supervisor', 'tareas.gestionar'), ('supervisor', 'contactos.ver'), ('supervisor', 'tickets.ver_departamento'),
  ('supervisor', 'tickets.gestionar'), ('supervisor', 'kpi.ver'),
  ('empleado', 'empleados.ver'), ('empleado', 'contactos.ver'), ('empleado', 'kpi.ver')
) as v(r, p) on conflict do nothing;

insert into public.asignaciones_permiso (sujeto_tipo, sujeto_id, permiso)
select 'departamento', d.id::text, v.p from (values
  ('DG', 'proyectos.ver_todos'), ('DG', 'tareas.ver_todas'), ('DG', 'clientes.ver'), ('DG', 'crm.ver'),
  ('DG', 'finanzas.ver'), ('DG', 'tickets.ver_todos'), ('DG', 'estadisticas.ver'), ('DG', 'kpi.ver'),
  ('COM', 'clientes.ver'), ('COM', 'clientes.gestionar'), ('COM', 'contactos.gestionar'), ('COM', 'crm.ver'), ('COM', 'crm.gestionar'),
  ('CONS', 'clientes.ver'), ('CONS', 'contactos.gestionar'),
  ('LEG', 'clientes.ver'), ('LEG', 'proyectos.ver_todos'),
  ('TEC', 'tickets.ver_departamento'), ('TEC', 'tickets.gestionar'),
  ('ADMFIN', 'clientes.ver'), ('ADMFIN', 'contactos.gestionar'), ('ADMFIN', 'finanzas.ver'), ('ADMFIN', 'finanzas.gestionar'),
  ('ADMFIN', 'proyectos.ver_todos'),
  ('TH', 'empleados.gestionar')
) as v(c, p) join public.departamentos d on d.codigo = v.c on conflict do nothing;

insert into public.catalogos (tipo, valor, orden) values
  ('categoria_ticket', 'Incidencia', 1), ('categoria_ticket', 'Consulta', 2), ('categoria_ticket', 'Requerimiento', 3),
  ('categoria_ticket', 'Acceso', 4), ('categoria_ticket', 'Facturación', 5),
  ('categoria_gasto', 'Nómina', 1), ('categoria_gasto', 'Servicios', 2), ('categoria_gasto', 'Software y licencias', 3),
  ('categoria_gasto', 'Infraestructura', 4), ('categoria_gasto', 'Marketing', 5), ('categoria_gasto', 'Impuestos', 6),
  ('categoria_gasto', 'Otros', 7),
  ('categoria_ingreso', 'Proyecto', 1), ('categoria_ingreso', 'Soporte', 2), ('categoria_ingreso', 'Consultoría', 3),
  ('categoria_ingreso', 'Otros', 4),
  ('tipo_contrato', 'Indefinido', 1), ('tipo_contrato', 'Tiempo determinado', 2), ('tipo_contrato', 'Por obra', 3),
  ('tipo_contrato', 'Pasantía', 4), ('tipo_contrato', 'Freelance', 5),
  ('fuente_crm', 'Sitio web', 1), ('fuente_crm', 'Referido', 2), ('fuente_crm', 'Redes sociales', 3),
  ('fuente_crm', 'WhatsApp', 4), ('fuente_crm', 'Evento', 5), ('fuente_crm', 'Llamada', 6), ('fuente_crm', 'Otro', 7)
on conflict do nothing;

insert into public.parametros (clave, valor, descripcion) values
  ('finanzas.moneda_base', '"USD"', 'Moneda de referencia de los reportes'),
  ('actividades.dias_aviso', '3', 'Días de anticipación para «próximos vencimientos»')
on conflict (clave) do nothing;

insert into public.kpis (nombre, departamento_id, formula, unidad, sentido, fuente, periodicidad)
select v.n, d.id, v.f, v.u, v.s, v.src, 'mensual' from (values
  ('Leads nuevos', 'COM', 'Oportunidades creadas en el período', 'leads', 'mayor', 'CRM (automático)'),
  ('Tasa de conversión', 'COM', 'Ganadas / (ganadas + perdidas) × 100', '%', 'mayor', 'CRM (automático)'),
  ('Valor del pipeline', 'COM', 'Σ valor × probabilidad de oportunidades abiertas', 'USD', 'mayor', 'CRM (automático)'),
  ('Cierres', 'COM', 'Oportunidades ganadas en el período', 'cierres', 'mayor', 'CRM (automático)'),
  ('Ciclo comercial', 'COM', 'Promedio de días entre creación y cierre ganado', 'días', 'menor', 'CRM (automático)'),
  ('Ticket promedio', 'COM', 'Valor ganado / número de cierres', 'USD', 'mayor', 'CRM (automático)'),
  ('Requisitos sin retrabajo', 'CONS', 'Requerimientos cumplidos sin cambios / total × 100', '%', 'mayor', 'Expedientes de proyecto'),
  ('Cambios por ambigüedad', 'CONS', 'Cambios atribuidos a requisitos ambiguos', 'cambios', 'menor', 'Registro manual'),
  ('Satisfacción del cliente', 'CONS', 'Promedio de encuestas de servicio', 'pts', 'mayor', 'Encuestas'),
  ('Cumplimiento funcional', 'CONS', 'Entregables cumplidos / comprometidos × 100', '%', 'mayor', 'Expedientes de proyecto'),
  ('Adopción', 'CONS', 'Usuarios activos del cliente / usuarios previstos × 100', '%', 'mayor', 'Registro manual'),
  ('Entregas', 'TEC', 'Actividades completadas en el período', 'entregas', 'mayor', 'Actividades (automático)'),
  ('Defectos por release', 'TEC', 'Incidencias reportadas / releases', 'defectos', 'menor', 'Soporte + registro manual'),
  ('Cobertura de pruebas', 'TEC', 'Líneas cubiertas / líneas totales × 100', '%', 'mayor', 'CI (registro manual)'),
  ('Tiempo de ciclo', 'TEC', 'Promedio de días entre creación y completado de actividades', 'días', 'menor', 'Actividades (automático)'),
  ('Disponibilidad', 'TEC', 'Tiempo en servicio / tiempo total × 100', '%', 'mayor', 'Monitoreo (registro manual)'),
  ('MTTR', 'TEC', 'Promedio de horas entre apertura y resolución de tickets', 'h', 'menor', 'Soporte (automático)'),
  ('Margen por proyecto', 'ADMFIN', '(Ingresos − gastos) / ingresos × 100', '%', 'mayor', 'Finanzas (automático)'),
  ('Cuentas por cobrar', 'ADMFIN', 'Σ saldo pendiente de facturas emitidas', 'USD', 'menor', 'Finanzas (automático)'),
  ('Tiempo de cobro', 'ADMFIN', 'Promedio de días entre emisión y pago total', 'días', 'menor', 'Finanzas (automático)'),
  ('Desviación presupuestaria', 'ADMFIN', '(Gasto real − presupuesto) / presupuesto × 100', '%', 'menor', 'Finanzas (automático)'),
  ('Flujo de caja', 'ADMFIN', 'Ingresos − gastos del período', 'USD', 'mayor', 'Finanzas (automático)'),
  ('Tiempo de contratación', 'TH', 'Días promedio desde la vacante hasta la incorporación', 'días', 'menor', 'Registro manual'),
  ('Calidad de contratación', 'TH', 'Evaluación promedio de ingresos del período', 'pts', 'mayor', 'Evaluaciones'),
  ('Rotación', 'TH', 'Desvinculados / plantilla promedio × 100', '%', 'menor', 'Empleados (automático)'),
  ('Onboarding', 'TH', 'Ingresos con inducción completa / ingresos × 100', '%', 'mayor', 'Registro manual'),
  ('Satisfacción del equipo', 'TH', 'Promedio de encuesta de clima', 'pts', 'mayor', 'Registro manual')
) as v(n, c, f, u, s, src) join public.departamentos d on d.codigo = v.c on conflict do nothing;

-- Contexto de la sesión para la app (rol, empleado, permisos efectivos y alcance). Solo datos propios.
create or replace function public.gestion_contexto() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('staff', app.es_staff(), 'rol', app.mi_rol(), 'empleado_id', app.mi_empleado_id(),
    'permisos', to_jsonb(app.mis_permisos()), 'departamentos', to_jsonb(app.mis_departamentos()));
$$;
revoke execute on function public.gestion_contexto() from public, anon;
grant execute on function public.gestion_contexto() to authenticated;

-- Desvinculación: valida el permiso por dentro, conserva el autor en la auditoría,
-- reasigna actividades abiertas, cierra las sesiones y conserva todo el historial.
create or replace function app.empleados_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() or current_setting('app.desvinculando', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    if new.rol_interno <> 'empleado' or new.profile_id is not null or new.estado <> 'activo' then
      raise exception 'Solo el administrador asigna roles internos y accesos' using errcode = '42501';
    end if;
  elsif (new.rol_interno, new.profile_id, new.estado, new.deleted_at) is distinct from (old.rol_interno, old.profile_id, old.estado, old.deleted_at) then
    raise exception 'Solo el administrador cambia rol, acceso o estado laboral' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.desvincular_empleado(emp uuid, motivo text, fecha date default current_date, reasignar_a uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.empleados; n int;
begin
  if not app.tiene_permiso('empleados.gestionar') then
    raise exception 'No tienes permiso para desvincular empleados' using errcode = '42501';
  end if;
  select * into e from public.empleados where id = emp for update;
  if e.id is null then raise exception 'Empleado no encontrado' using errcode = 'P0001'; end if;
  if e.estado = 'desvinculado' then raise exception 'El empleado ya está desvinculado' using errcode = 'P0001'; end if;
  if e.profile_id = auth.uid() then raise exception 'No puedes desvincularte a ti mismo' using errcode = '42501'; end if;
  if e.profile_id is not null and exists (select 1 from public.profiles where id = e.profile_id and role = 'admin') then
    raise exception 'El administrador principal no se desvincula' using errcode = '42501';
  end if;
  if coalesce(trim(motivo), '') = '' then raise exception 'Indica el motivo' using errcode = 'P0001'; end if;
  if reasignar_a is not null and not exists (select 1 from public.empleados where id = reasignar_a and estado = 'activo' and id <> emp) then
    raise exception 'El empleado para reasignar no está activo' using errcode = 'P0001';
  end if;

  perform set_config('app.desvinculando', '1', true);
  update public.tareas set responsable_id = reasignar_a
   where responsable_id = emp and estado not in ('completada', 'cancelada') and deleted_at is null;
  get diagnostics n = row_count;
  update public.tickets set responsable_id = reasignar_a where responsable_id = emp and estado not in ('resuelto', 'cerrado');
  update public.empleados set estado = 'desvinculado', fecha_desvinculacion = coalesce(fecha, current_date),
    motivo_desvinculacion = left(trim(motivo), 500) where id = emp;
  if e.profile_id is not null then delete from auth.sessions where user_id = e.profile_id; end if;
  perform set_config('app.desvinculando', '0', true);
  return jsonb_build_object('tareas_reasignadas', n, 'profile_id', e.profile_id);
end $$;
revoke execute on function public.desvincular_empleado(uuid, text, date, uuid) from public, anon;
grant execute on function public.desvincular_empleado(uuid, text, date, uuid) to authenticated;
drop function if exists app.cerrar_sesiones(uuid);

-- Clave estable para los KPI que el sistema calcula automáticamente (el nombre puede cambiarse)
alter table public.kpis add column if not exists clave text unique;
update public.kpis k set clave = v.c from (values
  ('Leads nuevos', 'com_leads'), ('Tasa de conversión', 'com_conversion'), ('Valor del pipeline', 'com_pipeline'),
  ('Cierres', 'com_cierres'), ('Ciclo comercial', 'com_ciclo'), ('Ticket promedio', 'com_ticket'),
  ('Satisfacción del cliente', 'cons_satisfaccion'), ('Cumplimiento funcional', 'cons_cumplimiento'),
  ('Entregas', 'tec_entregas'), ('Tiempo de ciclo', 'tec_ciclo'), ('MTTR', 'tec_mttr'),
  ('Margen por proyecto', 'fin_margen'), ('Cuentas por cobrar', 'fin_cxc'), ('Tiempo de cobro', 'fin_cobro'),
  ('Desviación presupuestaria', 'fin_desviacion'), ('Flujo de caja', 'fin_flujo'),
  ('Calidad de contratación', 'th_calidad'), ('Rotación', 'th_rotacion')
) as v(n, c) where k.nombre = v.n and k.clave is null;

-- Encuestas de servicio: lectura para quien ve estadísticas (KPI de satisfacción)
drop policy if exists "encuestas_staff_select" on public.encuestas;
create policy "encuestas_staff_select" on public.encuestas for select to authenticated using ((select app.tiene_permiso('estadisticas.ver')));
