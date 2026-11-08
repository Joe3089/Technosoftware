# Plataforma de gestión interna (`/gestion`)

Área privada del equipo de Technosoftware para planificar y operar la empresa. Funcionalmente parecida a Trello/ClickUp/Odoo, dentro del mismo proyecto Next.js. Usa la misma autenticación y la misma base de datos Supabase que el sitio y el área de clientes.

- **Sitio público** (`/`, `/quienes-somos`…): sin cambios.
- **Área de clientes** (`/dashboard`): sin cambios funcionales. El personal ve un botón «Gestión» en su encabezado.
- **Gestión interna** (`/gestion`): solo el administrador principal y los empleados activos.

## Arquitectura

```
Navegador ──► app/gestion/** (client components)
                 │  fetch
                 ▼
          app/api/gestion/**  ── requireStaff() ── rpc gestion_contexto()
                 │  cliente Supabase con la sesión del usuario (nunca service role para leer/escribir datos)
                 ▼
          PostgREST ──► Postgres + RLS (migración 010)  ◄── triggers: auditoría, reglas, notificaciones
```

- **Autorización en tres capas.**
  1. El layout de servidor `app/gestion/layout.tsx` redirige a quien no es del equipo.
  2. Cada ruta de API llama a `requireStaff()` (`lib/gestion/servidor.ts`), que obtiene el rol y los permisos de la base de datos con `gestion_contexto()`.
  3. RLS decide sobre cada fila.

  El cliente nunca envía roles ni permisos. La UI los usa solo para ocultar botones.
- **API genérica.** `app/api/gestion/[recurso]` y `[recurso]/[id]` dan acceso a las tablas del registro `RECURSOS` (`lib/gestion/recursos.ts`). Ninguna otra tabla es accesible. Cada recurso declara:
  - el `select` con sus embeds;
  - las columnas de búsqueda, filtrado y orden;
  - los esquemas Zod de alta y edición (si falta uno, la operación no está permitida);
  - el tipo de borrado (`soft`/`hard`/ninguno);
  - si es `soloAdmin`;
  - la columna de autor, que el servidor fija con el empleado actual.
- **Rutas especiales**: `contexto`, `resumen`, `buscar`, `notificaciones`, `estadisticas`, `finanzas/reporte`, `archivos`, `personal/[id]` (acceso, desvinculación, eliminación).
- **UI reutilizable** (`components/gestion/`):
  - `RecursoTabla`: lista paginada con búsqueda, filtros, orden y formulario.
  - `Formulario`: formulario declarativo con campos de texto, fecha, opciones, catálogo, referencia y booleano.
  - `SelectorRef`: búsqueda asíncrona sujeta a RLS.
  - `Adjuntos`, `Historial`, `Shell` (sidebar, buscador global, notificaciones).
  - `contexto.tsx`: sesión, permisos, avisos y `useLista`.
- **Sin dependencias nuevas.** El Kanban usa drag and drop nativo de HTML5, con un selector de estado como alternativa táctil. El Gantt y el calendario son componentes propios con pointer events. Los gráficos son barras CSS/SVG. No hay polling: las notificaciones se refrescan al volver a la pestaña.

## Módulos

| Ruta | Contenido |
|------|-----------|
| `/gestion` | Dashboard. Admin y mandos: empleados, proyectos (activos/pendientes/culminados), actividades vencidas y próximas, ingresos y gastos del mes, estado por departamento, alertas. Empleado: mis actividades, mis proyectos, completadas en 30 días. |
| `/gestion/actividades` | Lista (columnas configurables, orden, agrupación, cambio de estado en línea), Kanban (arrastrar cambia estado y orden), Gantt (día/semana/mes; mover, redimensionar, dependencias, hitos, progreso, vencidas), Calendario (arrastrar cambia la fecha). Las cuatro vistas usan el mismo conjunto de registros. Filtros: texto, estado, prioridad, departamento, responsable, «Mías», período. El detalle incluye subtareas, checklist, comentarios, archivos, colaboradores, dependencias e historial. |
| `/gestion/proyectos` y `/[id]` | Expediente único: fases 1–11 (clic para avanzar), datos, actividades del proyecto, equipo, contactos, hitos, requerimientos, entregables, incidencias, documentación, costos y facturación, observaciones (las existentes, visibles para el cliente) e historial. |
| `/gestion/contactos` | Directorio único (cliente, prospecto, proveedor, socio, contacto empresarial, otros). Correo y WhatsApp únicos. |
| `/gestion/clientes` | Tabla `clientes` existente (sin duplicar). Expediente con contactos, proyectos, oportunidades, facturas y tickets. |
| `/gestion/crm` | Pipeline Kanban de 7 etapas, interacciones con recordatorios, conversión en proyecto al ganar y reportes (conversión, pipeline ponderado, ciclo, ticket promedio, fuentes). |
| `/gestion/empleados` y `/[id]` | Expedientes, datos personales confidenciales, evaluaciones, documentos, actividades e historial. Acciones: dar acceso, desvincular, reincorporar, eliminar definitivamente. |
| `/gestion/finanzas` | Resumen (flujo, margen, cartera, por mes, por categoría, rentabilidad por proyecto), facturas por cobrar y por pagar con pagos, ingresos y gastos, presupuestos y la billetera de clientes en solo lectura. |
| `/gestion/soporte` | Tickets (número, cliente, proyecto, categoría, prioridad, responsable, estados), comentarios, archivos, historial, MTTR. |
| `/gestion/kpi` | KPI por departamento con fórmula, meta, unidad, sentido, fuente, periodicidad y responsable; valor automático, mediciones manuales y tendencia. |
| `/gestion/configuracion` | Solo admin: departamentos, cargos, roles y permisos (matriz), catálogos, parámetros, estados y prioridades (referencia) y auditoría. |

## Base de datos (migración `supabase/010_gestion_empresarial.sql`)

Es aditiva e idempotente: puede volver a ejecutarse sin efectos.

**Nuevas tablas:**
- **Organización:** `departamentos` (árbol: Dirección General → 6 áreas → sub-áreas), `cargos`, `empleados`, `empleado_datos` (datos sensibles), `empleado_evaluaciones`.
- **Permisos y configuración:** `permisos`, `asignaciones_permiso`, `catalogos`, `parametros`.
- **Proyectos:** `proyecto_equipo`, `proyecto_hitos`, `proyecto_items`, `proyecto_contactos`.
- **Contactos y actividades:** `contactos`, `tareas`, `tarea_colaboradores`, `tarea_checklist`, `tarea_comentarios`, `tarea_dependencias`.
- **CRM:** `oportunidades`, `crm_interacciones`.
- **Finanzas:** `facturas`, `pagos_factura`, `finanzas_registros`, `presupuestos_gestion`.
- **Soporte y KPI:** `tickets`, `ticket_comentarios`, `kpis` (con `clave` para los automáticos), `kpi_mediciones`.
- **Transversales:** `notificaciones`, `archivos_gestion` (bucket privado `gestion`), `auditoria`.

**Cambios en tablas existentes (solo aditivos):**
- `proyectos`: nuevas columnas `codigo` (PRY-0001, asignado a los existentes), `cliente_id`, `departamento_id`, `coordinador_id`, `prioridad`, `presupuesto`, `moneda`, `inicio_plan`, `fin_plan`, `etapa` (11 fases) y `deleted_at`. `user_id` pasa a ser opcional, para proyectos internos o de prospectos. `validar_entrega()` solo exige reunión final y encuesta a los proyectos que tienen cuenta de cliente.
- `profiles`: índice único parcial que garantiza **un único admin**.
- `clientes`: la política `clientes_select` antes permitía que **cualquier usuario autenticado** (incluidos los clientes) listara a todos los clientes. Ahora exige ser admin o tener `clientes.ver`.
- Políticas de solo lectura para el personal sobre `movimientos` (finanzas), `proyecto_observaciones` y `encuestas` (estadísticas).

**Funciones:**
- **Esquema `app`** (no expuesto por la Data API; `SECURITY DEFINER` con `search_path=''`): `mi_empleado_id`, `es_staff`, `mi_rol`, `mis_departamentos`, `tiene_permiso`, `mis_permisos`, `en_equipo`, `es_colaborador`, `gestiona_tarea`, `puede_editar_tarea`, `puede_ver_ticket`, `puede_ver_entidad`, y los triggers.
- **Esquema `public`:** `gestion_contexto()` (contexto propio) y `desvincular_empleado()`, que valida el permiso por dentro.

**Reglas que aplica la base de datos:**
- Auditoría de altas, cambios y bajas en 24 tablas. De los campos personales y de texto libre solo se registra el nombre del campo, nunca el valor.
- Al completar una tarea, se fija `progreso=100` y `completada_at`.
- Solo quien gestiona el departamento puede reasignar actividades.
- Las dependencias entre actividades no pueden formar ciclos.
- Facturas:
  - el monto de una factura emitida no cambia;
  - `pagado` solo se mueve registrando pagos, y no puede superar el total;
  - una factura con pagos no se anula.
- Pagos de factura: son inmutables.
- Registros de ingreso y gasto: solo se anulan, con motivo.
- Tickets: el estado `asignado` y las fechas de resolución y cierre se fijan solos.
- Al asignar una tarea o un ticket, o al comentar, se crea una notificación.

## Permisos (RBAC)

- **Administrador principal** (`profiles.role='admin'`, único): todo. Es el único que asigna roles internos, da o restituye accesos, edita la configuración y elimina expedientes.
- **Rol interno** del empleado: `coordinador`, `supervisor` o `empleado`.
- **Permisos efectivos** = rol + departamento + cargo + excepciones por empleado, de las cuales una denegación prevalece.
  - Una sub-área hereda los permisos de su área, pero **no los de Dirección General**, que solo aplican a sus propios miembros.
  - Coordinadores y supervisores ven su departamento y sus sub-áreas.
  - Un empleado ve lo suyo: lo que tiene asignado, lo que creó, donde colabora y los proyectos de cuyo equipo forma parte.
- **Asignaciones iniciales:** ver la sección «Datos base» de la migración, por ejemplo Comercialización → CRM y clientes, Administración y Finanzas → finanzas, Talento Humano → `empleados.gestionar`, Tecnología → tickets. Se cambian en Configuración → Roles y permisos.
- **Altas de personal:** el registro público solo crea clientes (`role='user'`). Una cuenta llega a `/gestion` únicamente si el admin la vincula a un expediente activo, ya sea con «Crear cuenta» (contraseña temporal que se muestra una vez) o con «Vincular cuenta existente».
- **Desvinculación** (Talento Humano o admin):
  1. Pide motivo y fecha.
  2. Reasigna las actividades y tickets abiertos.
  3. Cierra las sesiones y bloquea el inicio de sesión con un ban en Auth.
  4. Revoca el acceso de inmediato, porque `es_staff()` exige estado activo.
  5. Conserva el historial y la autoría.

  La eliminación definitiva queda reservada al admin, solo para desvinculados, exige escribir el correo para confirmar y la bloquean las FK `restrict` si existe historial que proteger.

## API

| Método y ruta | Uso |
|---------------|-----|
| `GET /api/gestion/:recurso?q&page&size&orden&dir&f.<col>=v[,v2]\|null&r.<col>=desde..hasta` | Lista paginada (máximo 200 por página). Columnas no declaradas se ignoran. |
| `POST /api/gestion/:recurso` | Alta validada con Zod. |
| `GET\|PATCH\|DELETE /api/gestion/:recurso/:id` | Detalle, edición parcial y borrado (soft o hard, según el registro). |
| `DELETE /api/gestion/:recurso?<pk1>&<pk2>` | Relaciones con clave compuesta (equipo, colaboradores, dependencias, contactos de proyecto). |
| `GET /api/gestion/contexto` | Rol, permisos, ficha y notificaciones sin leer. |
| `GET /api/gestion/resumen` | Dashboard. |
| `GET /api/gestion/buscar?q=` | Buscador global (con RLS). |
| `GET\|PATCH /api/gestion/notificaciones` | Lista y marca como leídas. |
| `GET /api/gestion/estadisticas?desde&hasta` | KPI automáticos; devuelve `null` en lo que no se puede ver. |
| `GET /api/gestion/finanzas/reporte?desde&hasta` | Reporte de gestión. |
| `POST /api/gestion/archivos`, `GET\|DELETE /api/gestion/archivos/:id` | Adjuntos (4 MB, validación por firma de archivo, URL firmada de 60 s). |
| `POST /api/gestion/personal/:id/acceso` | `crear`, `vincular` o `reincorporar` (admin). |
| `POST /api/gestion/personal/:id/desvincular` | Desvinculación. |
| `DELETE /api/gestion/personal/:id?confirmar=` | Eliminación definitiva (admin). |

Los errores se devuelven en español y sin detalles internos (`mensajeError`).

## Configuración

- **Variables de entorno:** no hay nuevas. Se usan las existentes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (solo en el servidor, para crear cuentas, banear y gestionar el storage), `POSTGRES_URL` (solo para aplicar migraciones).
- **Supabase:**
  - ejecutar `010_gestion_empresarial.sql` después de la 009;
  - crea el bucket privado `gestion`;
  - el esquema `app` no debe añadirse a los esquemas expuestos de la Data API.
- **Primer uso:**
  1. El admin crea los expedientes en Talento Humano.
  2. Les da acceso.
  3. Asigna coordinadores a los departamentos (Configuración) y define las metas de los KPI.
  4. Opcional: el admin puede crearse su propio expediente en Dirección General y vincular su cuenta («Vincular cuenta existente» con su correo) para recibir actividades y comentar. Su rol global no cambia y no se puede desvincular.

## Ejecutar y probar

```bash
npm run dev                # http://localhost:3000/gestion (requiere admin o empleado activo)
npx tsc --noEmit -p .      # tipos
npm run lint && npm run build
```

Validación realizada el 2026-11-07 contra la base real, con datos temporales que se eliminaron al terminar:
- **RLS simulando roles en SQL:** cliente sin acceso; admin con todo; empleado limitado a lo suyo; coordinador con sus sub-áreas; bloqueos de autoascenso y reasignación; desvinculado sin acceso; segundo admin rechazado.
- **E2E de las API contra `next start` con sesiones reales: 78/78.** Cubre los 33 recursos, permisos, Kanban, Gantt, checklist, comentarios, dependencias sin ciclos, archivos (firma y URL firmada), integridad de facturas, pagos y registros, y la desvinculación (revoca el acceso, bloquea el inicio de sesión, conserva el historial y la auditoría con autor).
- **Regresión:** el sitio público, `/login`, `/dashboard` y 13 APIs existentes responden 200; un cliente sigue viendo exactamente sus propios registros; CSRF devuelve 403.

## Pendientes y límites conocidos

- La finanza es de **gestión**: no implementa reglas tributarias ni contabilidad fiscal.
- Los estados de actividades, tickets y CRM y las prioridades son fijos, porque las reglas y las vistas dependen de ellos. Las categorías, fuentes y tipos de contrato sí son configurables.
- Las vistas de actividades cargan hasta 200 registros por filtro y avisan cuando hay más.
- El arrastre en el Kanban y el calendario es nativo de escritorio; en pantallas táctiles se usa el selector de estado.
- Las notificaciones son internas (campana). No hay correo porque Resend aún no está configurado.
- Los tickets creados por clientes desde `/dashboard` no están implementados; la tabla ya admite `solicitante_id`.
- No se hicieron pruebas visuales automatizadas del responsive; el diseño usa los mismos breakpoints de Tailwind que el resto del sitio.
