-- ════════════════════════════════════════════════════════════════════
-- 011 · Roles de sistema y rutas /dashboard/<módulo>. Ejecutar después de 010.
--
-- Roles del personal (ficha del empleado): admin_general (único), comercializacion,
-- finanzas, talento, devops, consultoria, legal. Cualquier rol puede marcarse como
-- coordinador. El rol «usuario» es el de los clientes (profiles.role = 'user'),
-- asignado automáticamente al registrarse; nunca aparece en la ficha.
-- Los permisos por defecto de cada rol están en supabase/seed/011_roles.sql.
-- ════════════════════════════════════════════════════════════════════

alter table public.empleados add column if not exists rol_sistema text;
alter table public.empleados add column if not exists es_coordinador boolean not null default false;
update public.empleados set rol_sistema = coalesce(rol_sistema, 'devops'),
  es_coordinador = es_coordinador or rol_interno in ('coordinador', 'supervisor')
  where rol_sistema is null;
alter table public.empleados alter column rol_sistema set not null;
do $$ begin
  alter table public.empleados add constraint empleados_rol_sistema_check check (rol_sistema in
    ('admin_general', 'comercializacion', 'finanzas', 'talento', 'devops', 'consultoria', 'legal'));
exception when duplicate_object then null; end $$;
-- Un único Administrador General
create unique index if not exists empleados_admin_general_unico on public.empleados (rol_sistema)
  where rol_sistema = 'admin_general' and deleted_at is null;

-- Asignaciones: "coordinador" = coordinadores de un rol (sujeto_id = rol) o de cualquiera ('*')
alter table public.asignaciones_permiso drop constraint if exists asignaciones_permiso_sujeto_tipo_check;
alter table public.asignaciones_permiso add constraint asignaciones_permiso_sujeto_tipo_check
  check (sujeto_tipo in ('rol', 'coordinador', 'departamento', 'cargo', 'empleado'));

-- ── Helpers actualizados (rol_interno deja de usarse) ────────────────
create or replace function app.mi_rol() returns text
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then 'admin'
    else (select e.rol_sistema from public.empleados e
          where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null) end;
$$;

create or replace function app.mis_departamentos() returns uuid[]
language sql stable security definer set search_path = '' as $$
  with recursive yo as (
    select e.id, e.departamento_id, e.es_coordinador from public.empleados e
    where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null
  ), raiz as (
    select departamento_id as id from yo where departamento_id is not null
    union select d.id from public.departamentos d join yo on d.coordinador_id = yo.id
  ), arbol as (
    select id from raiz
    union select d.id from public.departamentos d join arbol a on d.padre_id = a.id
      where exists (select 1 from yo where es_coordinador)
         or exists (select 1 from yo join public.departamentos c on c.coordinador_id = yo.id)
  )
  select coalesce(array_agg(id), '{}') from arbol;
$$;

create or replace function app.tiene_permiso(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  with recursive yo as (
    select e.id, e.rol_sistema, e.es_coordinador, e.departamento_id, e.cargo_id from public.empleados e
    where e.profile_id = auth.uid() and e.estado = 'activo' and e.deleted_at is null
  ), ancestros as (
    select departamento_id as id from yo where departamento_id is not null
    union select d.padre_id from public.departamentos d join ancestros a on d.id = a.id
      join public.departamentos p on p.id = d.padre_id where p.padre_id is not null
  )
  select case
    when public.is_admin() then true
    when not exists (select 1 from yo) then false
    when exists (select 1 from yo where rol_sistema = 'admin_general') then true
    when exists (select 1 from public.asignaciones_permiso a, yo
                 where a.sujeto_tipo = 'empleado' and a.sujeto_id = yo.id::text and a.permiso = p and not a.concedido) then false
    else exists (select 1 from public.asignaciones_permiso a, yo where a.permiso = p and a.concedido and (
         (a.sujeto_tipo = 'empleado' and a.sujeto_id = yo.id::text)
      or (a.sujeto_tipo = 'rol' and a.sujeto_id = yo.rol_sistema)
      or (a.sujeto_tipo = 'coordinador' and yo.es_coordinador and a.sujeto_id in (yo.rol_sistema, '*'))
      or (a.sujeto_tipo = 'cargo' and a.sujeto_id = yo.cargo_id::text)
      or (a.sujeto_tipo = 'departamento' and a.sujeto_id in (select id::text from ancestros))))
  end;
$$;

-- Consultoría (permiso tareas.asignar) crea y asigna actividades a cualquier empleado
-- (p. ej. programadores de DevOps) en proyectos de cuyo equipo forma parte o sin proyecto.
create or replace function app.asigna_tarea(proy uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.tiene_permiso('tareas.asignar') and (proy is null or app.en_equipo(proy) or app.tiene_permiso('proyectos.ver_todos'));
$$;

create or replace function app.puede_editar_tarea(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tareas t where t.id = tid and (
    public.is_admin() or t.responsable_id = app.mi_empleado_id() or t.creado_por = app.mi_empleado_id()
    or app.es_colaborador(t.id) or app.gestiona_tarea(t.departamento_id) or app.asigna_tarea(t.proyecto_id)));
$$;

create or replace function app.tareas_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(new.creado_por, app.mi_empleado_id());
  elsif auth.uid() is not null and not (app.gestiona_tarea(old.departamento_id) or app.asigna_tarea(old.proyecto_id)) and (
        new.responsable_id is distinct from old.responsable_id
     or new.departamento_id is distinct from old.departamento_id
     or new.creado_por is distinct from old.creado_por) then
    raise exception 'Solo quien gestiona o asigna actividades puede reasignarla' using errcode = '42501';
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

drop policy if exists "tareas_insert" on public.tareas;
create policy "tareas_insert" on public.tareas for insert to authenticated with check (
  (select app.es_staff()) and (responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(departamento_id) or app.asigna_tarea(proyecto_id)));
drop policy if exists "tareas_update" on public.tareas;
create policy "tareas_update" on public.tareas for update to authenticated
  using (app.puede_editar_tarea(id))
  with check ((select app.es_staff()) and (responsable_id = (select app.mi_empleado_id()) or app.es_colaborador(id)
    or creado_por = (select app.mi_empleado_id()) or app.gestiona_tarea(departamento_id) or app.asigna_tarea(proyecto_id)));
drop policy if exists "tarea_colaboradores_write" on public.tarea_colaboradores;
create policy "tarea_colaboradores_write" on public.tarea_colaboradores for all to authenticated
  using (exists (select 1 from public.tareas x where x.id = tarea_id and (x.responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(x.departamento_id) or app.asigna_tarea(x.proyecto_id))))
  with check (exists (select 1 from public.tareas x where x.id = tarea_id and (x.responsable_id = (select app.mi_empleado_id()) or app.gestiona_tarea(x.departamento_id) or app.asigna_tarea(x.proyecto_id))));

-- Ficha del empleado: el Administrador General y el coordinador de Talento (empleados.asignar_rol)
-- asignan roles; Administrador General solo puede ser la cuenta del admin principal.
create or replace function app.empleados_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare es_admin_prof boolean;
begin
  if new.profile_id is not null then
    select role = 'admin' into es_admin_prof from public.profiles where id = new.profile_id;
    if es_admin_prof then new.rol_sistema := 'admin_general'; end if;
  end if;
  if new.rol_sistema = 'admin_general' and new.profile_id is not null and not coalesce(es_admin_prof, false) then
    raise exception 'El rol Administrador General es exclusivo del administrador principal' using errcode = '42501';
  end if;
  if auth.uid() is null or public.is_admin() or current_setting('app.desvinculando', true) = '1' then return new; end if;

  if new.rol_sistema = 'admin_general' then
    raise exception 'Solo el administrador principal usa el rol Administrador General' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.estado <> 'activo' or new.profile_id is not null then
      raise exception 'Los accesos los otorga el administrador o el coordinador de Talento' using errcode = '42501';
    end if;
    if (new.rol_sistema <> 'devops' or new.es_coordinador) and not app.tiene_permiso('empleados.asignar_rol') then
      raise exception 'Solo el administrador o el coordinador de Talento asignan roles' using errcode = '42501';
    end if;
  else
    if (new.rol_sistema, new.es_coordinador) is distinct from (old.rol_sistema, old.es_coordinador)
       and not app.tiene_permiso('empleados.asignar_rol') then
      raise exception 'Solo el administrador o el coordinador de Talento asignan roles' using errcode = '42501';
    end if;
    if old.id = app.mi_empleado_id() and (new.rol_sistema, new.es_coordinador) is distinct from (old.rol_sistema, old.es_coordinador) then
      raise exception 'Nadie puede cambiar su propio rol' using errcode = '42501';
    end if;
    if (new.estado, new.deleted_at) is distinct from (old.estado, old.deleted_at) then
      raise exception 'El estado laboral se cambia con desvinculación o reincorporación' using errcode = '42501';
    end if;
    if new.profile_id is distinct from old.profile_id
       and not (old.profile_id is null and app.tiene_permiso('empleados.asignar_rol')) then
      raise exception 'Solo el administrador o el coordinador de Talento otorgan accesos' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop function if exists public.gestion_contexto();
create or replace function public.gestion_contexto() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('staff', app.es_staff(), 'rol', app.mi_rol(), 'empleado_id', app.mi_empleado_id(),
    'coordinador', coalesce((select e.es_coordinador from public.empleados e where e.id = app.mi_empleado_id()), false),
    'permisos', to_jsonb(app.mis_permisos()), 'departamentos', to_jsonb(app.mis_departamentos()));
$$;
revoke execute on function public.gestion_contexto() from public, anon;
grant execute on function public.gestion_contexto() to authenticated;

-- rol_interno queda obsoleto (sustituido por rol_sistema + es_coordinador)
alter table public.empleados drop column if exists rol_interno;

-- Enlaces de notificaciones: ahora /dashboard/<módulo>
alter table public.notificaciones drop constraint if exists notificaciones_enlace_check;
update public.notificaciones set enlace = regexp_replace(regexp_replace(enlace, '^/gestion/actividades', '/dashboard/planificacion'), '^/gestion', '/dashboard')
  where enlace like '/gestion%';
alter table public.notificaciones add constraint notificaciones_enlace_check check (enlace is null or enlace ~ '^/dashboard/');

create or replace function app.notificar_asignacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.responsable_id is not null and (tg_op = 'INSERT' or new.responsable_id is distinct from old.responsable_id) then
    if tg_table_name = 'tareas' then
      perform app.notificar(new.responsable_id, 'Nueva actividad asignada', new.titulo, '/dashboard/planificacion?tarea=' || new.id);
    else
      perform app.notificar(new.responsable_id, 'Ticket asignado #' || new.numero, new.titulo, '/dashboard/soporte?ticket=' || new.id);
    end if;
  end if;
  return new;
end $$;

create or replace function app.notificar_comentario() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select id, titulo, responsable_id into t from public.tareas where id = new.tarea_id;
  if t.responsable_id is not null and t.responsable_id is distinct from new.autor_id then
    perform app.notificar(t.responsable_id, 'Nuevo comentario', t.titulo, '/dashboard/planificacion?tarea=' || t.id);
  end if;
  return new;
end $$;

revoke execute on all functions in schema app from public;
grant execute on all functions in schema app to authenticated, service_role;
