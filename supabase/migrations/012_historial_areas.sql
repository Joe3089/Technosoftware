-- ════════════════════════════════════════════════════════════════════
-- 012 · Historial en todas las áreas. Ejecutar después de 011.
--  · Auditoría también en comentarios, checklist, dependencias, hitos, requerimientos,
--    interacciones CRM, comentarios de tickets y datos personales (solo nombres de campo).
--  · Cada evento de un registro hijo guarda su registro padre (padre/padre_id), así el
--    historial de una actividad incluye su checklist, comentarios y archivos.
--  · Cada área ve el historial de lo que ya puede ver (RLS); auditoria.ver ve todo.
-- ════════════════════════════════════════════════════════════════════

alter table public.auditoria add column if not exists padre text;
alter table public.auditoria add column if not exists padre_id text;
create index if not exists auditoria_padre_idx on public.auditoria (padre, padre_id);

create or replace function app.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sensibles constant text[] := array['datos', 'email', 'email_corporativo', 'telefono', 'whatsapp', 'direccion',
    'descripcion', 'observaciones', 'texto', 'notas', 'comentarios', 'resumen', 'avatar_url', 'full_name', 'nombre', 'apellido'];
  viejo jsonb; nuevo jsonb; reg jsonb; k text; dif jsonb := '{}'::jsonb; rid text; pad text; pid text;
begin
  if tg_op = 'DELETE' then viejo := to_jsonb(old); reg := viejo;
  elsif tg_op = 'INSERT' then nuevo := to_jsonb(new); reg := nuevo;
  else
    viejo := to_jsonb(old); nuevo := to_jsonb(new); reg := nuevo;
    for k in select jsonb_object_keys(nuevo) loop
      continue when k in ('updated_at', 'orden');
      if nuevo->k is distinct from viejo->k then
        dif := dif || jsonb_build_object(k, case when k = any(sensibles) then '"(modificado)"'::jsonb
                                             else jsonb_build_object('de', viejo->k, 'a', nuevo->k) end);
      end if;
    end loop;
    if dif = '{}'::jsonb then return new; end if;
  end if;
  rid := reg->>'id';
  case tg_table_name
    when 'tarea_checklist', 'tarea_comentarios', 'tarea_colaboradores', 'tarea_dependencias' then pad := 'tareas'; pid := reg->>'tarea_id';
    when 'tareas' then if reg->>'padre_id' is not null then pad := 'tareas'; pid := reg->>'padre_id'; end if;
    when 'proyecto_equipo', 'proyecto_hitos', 'proyecto_items', 'proyecto_contactos' then pad := 'proyectos'; pid := reg->>'proyecto_id';
    when 'ticket_comentarios' then pad := 'tickets'; pid := reg->>'ticket_id';
    when 'crm_interacciones' then
      if reg->>'oportunidad_id' is not null then pad := 'oportunidades'; pid := reg->>'oportunidad_id';
      else pad := 'contactos'; pid := reg->>'contacto_id'; end if;
    when 'empleado_evaluaciones', 'empleado_datos' then pad := 'empleados'; pid := reg->>'empleado_id';
    when 'pagos_factura' then pad := 'facturas'; pid := reg->>'factura_id';
    when 'kpi_mediciones' then pad := 'kpis'; pid := reg->>'kpi_id';
    when 'archivos_gestion' then
      pad := case reg->>'entidad' when 'tarea' then 'tareas' when 'proyecto' then 'proyectos' when 'ticket' then 'tickets'
        when 'oportunidad' then 'oportunidades' when 'contacto' then 'contactos' when 'factura' then 'facturas' when 'empleado' then 'empleados' end;
      pid := reg->>'entidad_id';
    else null;
  end case;
  insert into public.auditoria (actor_id, accion, entidad, entidad_id, cambios, padre, padre_id)
  values (auth.uid(), case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'actualizar' else 'eliminar' end,
          tg_table_name, rid, nullif(dif, '{}'::jsonb), pad, pid);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['crm_interacciones', 'proyecto_hitos', 'proyecto_items', 'proyecto_contactos', 'tarea_checklist',
    'tarea_comentarios', 'tarea_dependencias', 'ticket_comentarios', 'empleado_datos'] loop
    execute format('drop trigger if exists auditoria on public.%I', t);
    execute format('create trigger auditoria after insert or update or delete on public.%I for each row execute function app.auditar()', t);
  end loop;
end $$;

-- Eventos anteriores de registros hijo: completar su padre
update public.auditoria a set padre = 'tareas', padre_id = coalesce(a.cambios->'tarea_id'->>'a', a.padre_id)
  where a.padre is null and a.entidad in ('tarea_colaboradores');
update public.auditoria set padre = 'proyectos' where padre is null and entidad = 'proyecto_equipo';
update public.auditoria set padre = 'facturas' where padre is null and entidad = 'pagos_factura';
update public.auditoria set padre = 'kpis' where padre is null and entidad = 'kpi_mediciones';
update public.auditoria set padre = 'empleados' where padre is null and entidad = 'empleado_evaluaciones';

-- Visibilidad por área: el historial de un registro se ve si el registro (o su padre) es visible
-- para el usuario según RLS. SECURITY INVOKER: las consultas pasan por las políticas de cada tabla.
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
    when 'empleados'     then app.tiene_permiso('empleados.gestionar') or u = app.mi_empleado_id()
    when 'finanzas_registros' then app.tiene_permiso('finanzas.ver')
    when 'presupuestos_gestion' then app.tiene_permiso('finanzas.ver')
    when 'movimientos'   then app.tiene_permiso('finanzas.ver')
    when 'kpis'          then app.tiene_permiso('kpi.ver')
    else false
  end;
end $$;
revoke execute on function app.puede_ver_auditoria(text, text, text, text) from public;
grant execute on function app.puede_ver_auditoria(text, text, text, text) to authenticated;

drop policy if exists "auditoria_select" on public.auditoria;
create policy "auditoria_select" on public.auditoria for select to authenticated
  using ((select app.tiene_permiso('auditoria.ver')) or app.puede_ver_auditoria(entidad, entidad_id, padre, padre_id));
