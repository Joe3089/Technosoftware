-- ════════════════════════════════════════════════════════════════════
-- 014 · Vistas restringidas por rol + paneles de administración dentro de la gestión.
-- Ejecutar después de 013; luego supabase/seed/014_roles.sql.
--  · Pagos (verificación) → Finanzas; Solicitudes, Correos y Clientes → CRM (permisos propios).
--  · Proyectos "contratados" (contrato verificado o fase posterior a Contrato).
--  · Directorio de empleados restringido: DevOps solo ve al consultor y QA de sus proyectos.
--  · KPI visibles solo para su área. Documentos de área (estrategias, entrevistas, definición
--    técnica, reportes, contratos, normativas…) con visibilidad por rol y coordinación.
-- ════════════════════════════════════════════════════════════════════

insert into public.permisos (codigo, modulo, descripcion) values
  ('pagos.verificar', 'Finanzas', 'Verificar pagos reportados para que la IA los concilie'),
  ('solicitudes.gestionar', 'CRM', 'Atender solicitudes de proyectos, consultorías y reuniones de clientes'),
  ('crm.correos', 'CRM', 'Enviar correos masivos a clientes'),
  ('proyectos.ver_contratados', 'Proyectos', 'Ver los proyectos formalmente contratados y sus contratos'),
  ('proyectos.asignar_equipo', 'Proyectos', 'Asignar personal al equipo de proyectos contratados')
on conflict (codigo) do nothing;

-- ── Área de cada rol (departamento raíz) ─────────────────────────────
create or replace function app.area_departamentos(rol text) returns uuid[]
language sql stable security definer set search_path = '' as $$
  with recursive raiz as (
    select id from public.departamentos where codigo = case rol
      when 'comercializacion' then 'COM' when 'finanzas' then 'ADMFIN' when 'talento' then 'TH'
      when 'devops' then 'TEC' when 'consultoria' then 'CONS' when 'legal' then 'LEG' end
  ), arbol as (select id from raiz union select d.id from public.departamentos d join arbol a on d.padre_id = a.id)
  select coalesce(array_agg(id), '{}') from arbol;
$$;

create or replace function app.es_coordinador() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or coalesce((select e.es_coordinador from public.empleados e where e.id = app.mi_empleado_id()), false);
$$;

-- ── Proyectos contratados ────────────────────────────────────────────
create or replace function app.proyecto_contratado(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contratos c where c.proyecto_id = pid and c.estado = 'verificado')
      or exists (select 1 from public.proyectos p where p.id = pid and (p.etapa in
         ('arquitectura', 'desarrollo_qa', 'implementacion', 'capacitacion', 'facturacion', 'soporte') or p.estado in ('en_progreso', 'revision', 'completado')));
$$;

drop policy if exists "proyectos_staff_select" on public.proyectos;
create policy "proyectos_staff_select" on public.proyectos for select to authenticated using (
  (select app.tiene_permiso('proyectos.ver_todos'))
  or ((select app.tiene_permiso('proyectos.ver_departamento')) and departamento_id in (select unnest(app.mis_departamentos())))
  or ((select app.tiene_permiso('proyectos.ver_contratados')) and app.proyecto_contratado(id))
  or app.en_equipo(id)
  or exists (select 1 from public.tareas t where t.proyecto_id = proyectos.id and t.responsable_id = (select app.mi_empleado_id())));
drop policy if exists "proyectos_staff_update" on public.proyectos;
create policy "proyectos_staff_update" on public.proyectos for update to authenticated
  using ((select app.tiene_permiso('proyectos.gestionar')) and ((select app.tiene_permiso('proyectos.ver_todos'))
    or departamento_id in (select unnest(app.mis_departamentos())) or coordinador_id = (select app.mi_empleado_id())
    or ((select app.tiene_permiso('proyectos.ver_contratados')) and app.proyecto_contratado(id))))
  with check ((select app.tiene_permiso('proyectos.gestionar')) and ((select app.tiene_permiso('proyectos.ver_todos'))
    or departamento_id in (select unnest(app.mis_departamentos())) or coordinador_id = (select app.mi_empleado_id())
    or ((select app.tiene_permiso('proyectos.ver_contratados')) and app.proyecto_contratado(id))));

-- Equipo del proyecto: lo define quien gestiona proyectos o quien asigna personal (DevOps) en contratados
drop policy if exists "proyecto_equipo_write" on public.proyecto_equipo;
create policy "proyecto_equipo_write" on public.proyecto_equipo for all to authenticated
  using (((select app.tiene_permiso('proyectos.gestionar')) or ((select app.tiene_permiso('proyectos.asignar_equipo')) and app.proyecto_contratado(proyecto_id)))
    and exists (select 1 from public.proyectos p where p.id = proyecto_id))
  with check (((select app.tiene_permiso('proyectos.gestionar')) or ((select app.tiene_permiso('proyectos.asignar_equipo')) and app.proyecto_contratado(proyecto_id)))
    and exists (select 1 from public.proyectos p where p.id = proyecto_id));

-- Contratos del flujo de clientes: visibles para quien ve proyectos contratados
drop policy if exists "contratos_staff_select" on public.contratos;
create policy "contratos_staff_select" on public.contratos for select to authenticated
  using ((select app.tiene_permiso('proyectos.ver_contratados')) and app.proyecto_contratado(proyecto_id));

-- Asignar tareas: también en proyectos contratados para quien los ve (coordinación DevOps / PM)
create or replace function app.asigna_tarea(proy uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.tiene_permiso('tareas.asignar') and (proy is null or app.en_equipo(proy) or app.tiene_permiso('proyectos.ver_todos')
    or (app.tiene_permiso('proyectos.ver_contratados') and app.proyecto_contratado(proy)));
$$;

-- ── Directorio de empleados ──────────────────────────────────────────
create or replace function app.puede_ver_empleado(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.tiene_permiso('empleados.ver') or eid = app.mi_empleado_id()
    or eid = (select e.supervisor_id from public.empleados e where e.id = app.mi_empleado_id())
    or exists (
      select 1 from public.proyecto_equipo a
      join public.proyecto_equipo b on b.proyecto_id = a.proyecto_id
      join public.empleados o on o.id = b.empleado_id
      where a.empleado_id = app.mi_empleado_id() and b.empleado_id = eid
        and (app.mi_rol() is distinct from 'devops' or app.es_coordinador()
             or o.rol_sistema = 'consultoria' or o.es_coordinador
             or o.departamento_id = (select d.id from public.departamentos d where d.codigo = 'QA')));
$$;
drop policy if exists "empleados_select" on public.empleados;
create policy "empleados_select" on public.empleados for select to authenticated
  using ((select app.es_staff()) and app.puede_ver_empleado(id));

-- ── KPI: cada área ve los suyos (admin y quien tenga estadisticas.ver de Dirección, todos) ─
drop policy if exists "kpis_select" on public.kpis;
create policy "kpis_select" on public.kpis for select to authenticated using ((select app.tiene_permiso('kpi.ver')) and (
  (select public.is_admin()) or departamento_id is null
  or departamento_id in (select unnest(app.area_departamentos(app.mi_rol())))
  or departamento_id in (select unnest(app.mis_departamentos()))));
drop policy if exists "kpi_med_select" on public.kpi_mediciones;
create policy "kpi_med_select" on public.kpi_mediciones for select to authenticated
  using (exists (select 1 from public.kpis k where k.id = kpi_id));

-- ── Flujos que antes eran solo del admin ─────────────────────────────
drop policy if exists "recargas_staff_select" on public.recargas;
create policy "recargas_staff_select" on public.recargas for select to authenticated using ((select app.tiene_permiso('pagos.verificar')));
do $$ declare t text; begin
  foreach t in array array['consultorias', 'solicitudes_proyecto', 'reuniones'] loop
    execute format('drop policy if exists "%s_staff_select" on public.%I', t, t);
    execute format('create policy "%s_staff_select" on public.%I for select to authenticated using ((select app.tiene_permiso(''solicitudes.gestionar'')))', t, t);
    execute format('drop policy if exists "%s_staff_update" on public.%I', t, t);
    execute format('create policy "%s_staff_update" on public.%I for update to authenticated using ((select app.tiene_permiso(''solicitudes.gestionar''))) with check ((select app.tiene_permiso(''solicitudes.gestionar'')))', t, t);
  end loop;
end $$;
drop policy if exists "adjuntos_staff_select" on public.adjuntos;
create policy "adjuntos_staff_select" on public.adjuntos for select to authenticated
  using ((select app.tiene_permiso('solicitudes.gestionar')) or (select app.tiene_permiso('pagos.verificar')));
drop policy if exists "campanas_staff" on public.campanas_email;
create policy "campanas_staff" on public.campanas_email for all to authenticated
  using ((select app.tiene_permiso('crm.correos'))) with check ((select app.tiene_permiso('crm.correos')));

-- ── Documentos de área ───────────────────────────────────────────────
create table if not exists public.documentos_area (
  id             uuid primary key default gen_random_uuid(),
  area           text not null check (area in ('comercializacion', 'finanzas', 'talento', 'devops', 'consultoria', 'legal')),
  tipo           text not null check (tipo in (
                   'estrategia', 'estudio_mercado', 'reporte',                                  -- Comercialización
                   'candidato', 'entrevista', 'bienestar', 'contenido',                         -- Talento
                   'definicion_tecnica',                                                        -- DevOps
                   'seguimiento', 'reporte_proyecto', 'documentacion', 'reporte_qa',
                   'reporte_programador', 'reporte_departamento',                               -- Consultoría
                   'contrato', 'normativa')),                                                   -- Legal
  titulo         text not null check (char_length(titulo) between 1 and 200),
  contenido      text,
  estado         text not null default 'borrador'
                 check (estado in ('borrador', 'en_revision', 'aprobado', 'publicado', 'rechazado', 'programado', 'realizado', 'cumple', 'en_proceso', 'incumple', 'presentado', 'firmado')),
  fecha          timestamptz,
  proyecto_id    uuid references public.proyectos(id) on delete set null,
  cliente_id     uuid references public.clientes(id) on delete set null,
  responsable_id uuid references public.empleados(id) on delete set null,
  autor_id       uuid references public.empleados(id) on delete set null,
  datos          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists documentos_area_idx on public.documentos_area (area, tipo, created_at desc);
create index if not exists documentos_proyecto_idx on public.documentos_area (proyecto_id);

-- Tipos que solo maneja la coordinación (y el admin)
create or replace function app.tipo_coordinacion(t text) returns boolean language sql immutable set search_path = '' as $$
  select t in ('estrategia', 'estudio_mercado', 'reporte', 'entrevista', 'bienestar', 'definicion_tecnica', 'reporte_departamento');
$$;
-- Tipos de proyecto visibles para su equipo (consultor, programadores, QA)
create or replace function app.tipo_proyecto(t text) returns boolean language sql immutable set search_path = '' as $$
  select t in ('seguimiento', 'reporte_proyecto', 'documentacion', 'reporte_qa', 'reporte_programador', 'definicion_tecnica');
$$;

create or replace function app.documentos_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.autor_id := coalesce(app.mi_empleado_id(), new.autor_id); end if;
  -- Aprobar, verificar o publicar es decisión de la coordinación del área
  if auth.uid() is not null and not app.es_coordinador()
     and new.estado in ('aprobado', 'publicado', 'rechazado', 'firmado')
     and (tg_op = 'INSERT' or new.estado is distinct from old.estado) then
    raise exception 'Solo la coordinación del área aprueba o publica' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists documentos_guard on public.documentos_area;
create trigger documentos_guard before insert or update on public.documentos_area for each row execute function app.documentos_guard();
drop trigger if exists auditoria on public.documentos_area;
create trigger auditoria after insert or update or delete on public.documentos_area for each row execute function app.auditar();

alter table public.documentos_area enable row level security;
revoke all on public.documentos_area from anon;
grant select, insert, update, delete on public.documentos_area to authenticated;

drop policy if exists "documentos_select" on public.documentos_area;
create policy "documentos_select" on public.documentos_area for select to authenticated using (
  (select public.is_admin())
  or (area = (select app.mi_rol()) and ((select app.es_coordinador()) or autor_id = (select app.mi_empleado_id())
      or responsable_id = (select app.mi_empleado_id()) or not app.tipo_coordinacion(tipo)))
  or (proyecto_id is not null and app.tipo_proyecto(tipo) and app.en_equipo(proyecto_id))
  or (tipo in ('bienestar', 'contenido') and estado = 'publicado' and (select app.es_staff()))
  or (tipo = 'contrato' and proyecto_id is not null and (select app.tiene_permiso('proyectos.ver_contratados')) and app.proyecto_contratado(proyecto_id)));
drop policy if exists "documentos_insert" on public.documentos_area;
create policy "documentos_insert" on public.documentos_area for insert to authenticated with check (
  (select public.is_admin()) or (area = (select app.mi_rol()) and ((select app.es_coordinador()) or not app.tipo_coordinacion(tipo))));
drop policy if exists "documentos_update" on public.documentos_area;
create policy "documentos_update" on public.documentos_area for update to authenticated
  using ((select public.is_admin()) or autor_id = (select app.mi_empleado_id()) or (area = (select app.mi_rol()) and (select app.es_coordinador())))
  with check ((select public.is_admin()) or area = (select app.mi_rol()));
drop policy if exists "documentos_delete" on public.documentos_area;
create policy "documentos_delete" on public.documentos_area for delete to authenticated
  using ((select public.is_admin()) or (autor_id = (select app.mi_empleado_id()) and estado = 'borrador'));

-- Archivos y auditoría también para documentos
alter table public.archivos_gestion drop constraint if exists archivos_gestion_entidad_check;
alter table public.archivos_gestion add constraint archivos_gestion_entidad_check
  check (entidad in ('tarea', 'proyecto', 'ticket', 'oportunidad', 'contacto', 'factura', 'empleado', 'documento'));
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
    when 'documento'   then exists (select 1 from public.documentos_area where id = eid)
    when 'empleado'    then eid = app.mi_empleado_id() or app.tiene_permiso('empleados.gestionar')
    else false end;
end $$;

create or replace function app.puede_ver_auditoria(ent text, eid text, pad text, pid text) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
declare e text := coalesce(pad, ent); i text := coalesce(pid, eid); u uuid;
begin
  if not app.es_staff() then return false; end if;
  if i ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then u := i::uuid; end if;
  return case e
    when 'tareas'        then u is not null and exists (select 1 from public.tareas where id = u)
    when 'proyectos'     then u is not null and exists (select 1 from public.proyectos where id = u)
    when 'tickets'       then u is not null and exists (select 1 from public.tickets where id = u)
    when 'oportunidades' then u is not null and exists (select 1 from public.oportunidades where id = u)
    when 'contactos'     then u is not null and exists (select 1 from public.contactos where id = u)
    when 'clientes'      then u is not null and exists (select 1 from public.clientes where id = u)
    when 'facturas'      then u is not null and exists (select 1 from public.facturas where id = u)
    when 'documentos_area' then u is not null and exists (select 1 from public.documentos_area where id = u)
    when 'empleados'     then app.tiene_permiso('empleados.gestionar') or u = app.mi_empleado_id()
    when 'finanzas_registros' then app.tiene_permiso('finanzas.ver')
    when 'presupuestos_gestion' then app.tiene_permiso('finanzas.ver')
    when 'movimientos'   then app.tiene_permiso('finanzas.ver')
    when 'kpis'          then app.tiene_permiso('kpi.ver')
    else false
  end;
end $$;

revoke execute on all functions in schema app from public;
grant execute on all functions in schema app to authenticated, service_role;

-- KPI: la escritura también se limita al área (FOR ALL concedía además lectura de todos)
create or replace function app.kpi_de_mi_area(dep uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or dep is null or dep = any(app.area_departamentos(app.mi_rol())) or dep = any(app.mis_departamentos());
$$;
grant execute on function app.kpi_de_mi_area(uuid) to authenticated;
drop policy if exists "kpis_write" on public.kpis;
drop policy if exists "kpis_insert" on public.kpis;
drop policy if exists "kpis_update" on public.kpis;
drop policy if exists "kpis_delete" on public.kpis;
create policy "kpis_insert" on public.kpis for insert to authenticated
  with check ((select app.tiene_permiso('kpi.gestionar')) and app.kpi_de_mi_area(departamento_id));
create policy "kpis_update" on public.kpis for update to authenticated
  using ((select app.tiene_permiso('kpi.gestionar')) and app.kpi_de_mi_area(departamento_id))
  with check ((select app.tiene_permiso('kpi.gestionar')) and app.kpi_de_mi_area(departamento_id));
create policy "kpis_delete" on public.kpis for delete to authenticated using ((select public.is_admin()));
drop policy if exists "kpi_med_write" on public.kpi_mediciones;
drop policy if exists "kpi_med_insert" on public.kpi_mediciones;
drop policy if exists "kpi_med_delete" on public.kpi_mediciones;
create policy "kpi_med_insert" on public.kpi_mediciones for insert to authenticated with check (exists (select 1 from public.kpis k where k.id = kpi_id
  and (((select app.tiene_permiso('kpi.gestionar')) and app.kpi_de_mi_area(k.departamento_id)) or k.responsable_id = (select app.mi_empleado_id()))));
create policy "kpi_med_delete" on public.kpi_mediciones for delete to authenticated using (exists (select 1 from public.kpis k where k.id = kpi_id
  and (((select app.tiene_permiso('kpi.gestionar')) and app.kpi_de_mi_area(k.departamento_id)) or k.responsable_id = (select app.mi_empleado_id()))));
