-- Permisos por defecto de los roles de sistema (idempotente). Ejecutar después de la migración 011.
-- Se pueden ajustar después en /dashboard/configuracion → Roles y permisos.

insert into public.permisos (codigo, modulo, descripcion) values
  ('tareas.asignar', 'Actividades', 'Crear y asignar actividades a cualquier empleado en sus proyectos'),
  ('empleados.asignar_rol', 'Talento Humano', 'Asignar roles de sistema y coordinación en la ficha del empleado')
on conflict (codigo) do nothing;

-- Sustituye los roles internos anteriores (coordinador/supervisor/empleado) y los permisos por área
delete from public.asignaciones_permiso where sujeto_tipo = 'rol' and sujeto_id in ('coordinador', 'supervisor', 'empleado');
delete from public.asignaciones_permiso a using public.departamentos d
  where a.sujeto_tipo = 'departamento' and a.sujeto_id = d.id::text and d.codigo in ('COM', 'CONS', 'LEG', 'TEC', 'ADMFIN', 'TH');

insert into public.asignaciones_permiso (sujeto_tipo, sujeto_id, permiso)
select v.t, v.s, v.p from (values
  -- Base de todo el personal
  ('rol', 'comercializacion', 'empleados.ver'), ('rol', 'finanzas', 'empleados.ver'), ('rol', 'talento', 'empleados.ver'),
  ('rol', 'devops', 'empleados.ver'), ('rol', 'consultoria', 'empleados.ver'), ('rol', 'legal', 'empleados.ver'),
  ('rol', 'comercializacion', 'contactos.ver'), ('rol', 'finanzas', 'contactos.ver'), ('rol', 'talento', 'contactos.ver'),
  ('rol', 'devops', 'contactos.ver'), ('rol', 'consultoria', 'contactos.ver'), ('rol', 'legal', 'contactos.ver'),
  ('rol', 'comercializacion', 'kpi.ver'), ('rol', 'finanzas', 'kpi.ver'), ('rol', 'talento', 'kpi.ver'),
  ('rol', 'devops', 'kpi.ver'), ('rol', 'consultoria', 'kpi.ver'), ('rol', 'legal', 'kpi.ver'),
  -- Comercialización: clientes, contactos y CRM
  ('rol', 'comercializacion', 'clientes.ver'), ('rol', 'comercializacion', 'clientes.gestionar'),
  ('rol', 'comercializacion', 'contactos.gestionar'), ('rol', 'comercializacion', 'crm.ver'), ('rol', 'comercializacion', 'crm.gestionar'),
  -- Finanzas
  ('rol', 'finanzas', 'finanzas.ver'), ('rol', 'finanzas', 'finanzas.gestionar'), ('rol', 'finanzas', 'clientes.ver'),
  ('rol', 'finanzas', 'contactos.gestionar'), ('rol', 'finanzas', 'proyectos.ver_todos'),
  -- Talento: el coordinador gestiona fichas y asigna roles
  ('coordinador', 'talento', 'empleados.gestionar'), ('coordinador', 'talento', 'empleados.asignar_rol'),
  -- DevOps / Desarrollo: soporte técnico
  ('rol', 'devops', 'tickets.ver_departamento'), ('rol', 'devops', 'tickets.gestionar'),
  -- Consultoría: proyectos, requerimientos y asignación de tareas a programadores
  ('rol', 'consultoria', 'clientes.ver'), ('rol', 'consultoria', 'contactos.gestionar'), ('rol', 'consultoria', 'proyectos.ver_departamento'),
  ('rol', 'consultoria', 'proyectos.gestionar'), ('rol', 'consultoria', 'tareas.asignar'), ('rol', 'consultoria', 'tareas.ver_departamento'),
  -- Legal: contratos de todos los proyectos
  ('rol', 'legal', 'clientes.ver'), ('rol', 'legal', 'proyectos.ver_todos'),
  -- Cualquier coordinador
  ('coordinador', '*', 'tareas.gestionar'), ('coordinador', '*', 'tareas.ver_departamento'), ('coordinador', '*', 'tareas.asignar'),
  ('coordinador', '*', 'proyectos.ver_departamento'), ('coordinador', '*', 'proyectos.gestionar'),
  ('coordinador', '*', 'tickets.ver_departamento'), ('coordinador', '*', 'kpi.gestionar'), ('coordinador', '*', 'estadisticas.ver')
) as v(t, s, p) on conflict do nothing;
