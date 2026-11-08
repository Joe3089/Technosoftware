-- Permisos por rol y coordinación (sustituye a seed/011). Idempotente.
-- Personal operativo = rol; coordinación = 'coordinador' + rol. Ajustables en Configuración → Roles y permisos.
delete from public.asignaciones_permiso where sujeto_tipo in ('rol', 'coordinador');

insert into public.asignaciones_permiso (sujeto_tipo, sujeto_id, permiso)
select v.t, v.s, v.p from (values
  -- Comercialización: el equipo trabaja el CRM; la coordinación ve métricas, estrategias, estudios y reportes
  ('rol', 'comercializacion', 'crm.gestionar'), ('rol', 'comercializacion', 'clientes.ver'), ('rol', 'comercializacion', 'clientes.gestionar'),
  ('rol', 'comercializacion', 'contactos.ver'), ('rol', 'comercializacion', 'contactos.gestionar'), ('rol', 'comercializacion', 'solicitudes.gestionar'),
  ('coordinador', 'comercializacion', 'crm.ver'), ('coordinador', 'comercializacion', 'crm.correos'), ('coordinador', 'comercializacion', 'kpi.ver'),
  ('coordinador', 'comercializacion', 'kpi.gestionar'), ('coordinador', 'comercializacion', 'estadisticas.ver'), ('coordinador', 'comercializacion', 'empleados.ver'),
  -- Finanzas: el equipo verifica pagos (la IA concilia); la coordinación verifica cuentas y movimientos
  ('rol', 'finanzas', 'pagos.verificar'),
  ('coordinador', 'finanzas', 'finanzas.ver'), ('coordinador', 'finanzas', 'finanzas.gestionar'), ('coordinador', 'finanzas', 'clientes.ver'),
  ('coordinador', 'finanzas', 'contactos.ver'), ('coordinador', 'finanzas', 'contactos.gestionar'), ('coordinador', 'finanzas', 'kpi.ver'),
  ('coordinador', 'finanzas', 'estadisticas.ver'), ('coordinador', 'finanzas', 'empleados.ver'),
  -- Talento: el equipo crea contenido y analiza candidatos; la coordinación verifica entrevistas, organiza bienestar y gestiona fichas
  ('coordinador', 'talento', 'empleados.ver'), ('coordinador', 'talento', 'empleados.gestionar'), ('coordinador', 'talento', 'empleados.asignar_rol'),
  ('coordinador', 'talento', 'kpi.ver'), ('coordinador', 'talento', 'estadisticas.ver'),
  -- DevOps: los programadores solo ven su proyecto (y al consultor y QA); soporte técnico
  ('rol', 'devops', 'tickets.ver_departamento'), ('rol', 'devops', 'tickets.gestionar'),
  ('coordinador', 'devops', 'proyectos.ver_contratados'), ('coordinador', 'devops', 'proyectos.asignar_equipo'),
  ('coordinador', 'devops', 'tareas.asignar'), ('coordinador', 'devops', 'tareas.gestionar'), ('coordinador', 'devops', 'tareas.ver_departamento'),
  ('coordinador', 'devops', 'empleados.ver'), ('coordinador', 'devops', 'kpi.ver'),
  -- Consultoría: los consultores siguen sus proyectos y redactan tareas; la coordinación (PM) ve todos los contratados y asigna consultores
  ('rol', 'consultoria', 'tareas.asignar'), ('rol', 'consultoria', 'contactos.ver'), ('rol', 'consultoria', 'clientes.ver'),
  ('coordinador', 'consultoria', 'proyectos.ver_contratados'), ('coordinador', 'consultoria', 'proyectos.gestionar'),
  ('coordinador', 'consultoria', 'tareas.gestionar'), ('coordinador', 'consultoria', 'tareas.ver_todas'), ('coordinador', 'consultoria', 'empleados.ver'),
  ('coordinador', 'consultoria', 'kpi.ver'), ('coordinador', 'consultoria', 'kpi.gestionar'), ('coordinador', 'consultoria', 'estadisticas.ver'),
  -- Legal: redacta y carga contratos; vela por el cumplimiento normativo
  ('rol', 'legal', 'clientes.ver'), ('rol', 'legal', 'proyectos.ver_todos'), ('rol', 'legal', 'contactos.ver'),
  ('coordinador', 'legal', 'kpi.ver'), ('coordinador', 'legal', 'empleados.ver')
) as v(t, s, p) on conflict do nothing;
