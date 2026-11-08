import { z } from "zod";
import * as C from "./constantes";

// Registro de recursos expuestos por /api/gestion/[recurso]. Solo las tablas listadas
// aquí son accesibles; cada operación se valida con Zod y la ejecuta el cliente de la
// sesión, de modo que RLS (migración 010) siempre tiene la última palabra.

const vacioANull = (v: unknown) => (v === "" ? null : v);
const id = z.uuid();
const ref = z.preprocess(vacioANull, z.uuid().nullable()).optional();
const texto = (max = 200) => z.string().trim().min(1, "Campo obligatorio").max(max);
const textoOpc = (max = 2000) => z.preprocess(vacioANull, z.string().trim().max(max).nullable()).optional();
const fecha = z.preprocess(vacioANull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").nullable()).optional();
const fechaHora = z.preprocess(vacioANull, z.iso.datetime({ offset: true }).nullable()).optional();
const numero = (min = 0, max = 1e12) => z.preprocess(vacioANull, z.coerce.number().min(min).max(max).nullable()).optional();
const email = z.preprocess(vacioANull, z.email("Correo inválido").max(254).nullable()).optional();
const en = (o: C.Opcion[]) => z.enum(C.valores(o));

export interface Recurso {
  tabla: string;
  select: string;
  pk?: string | string[];          // "id" por defecto; array = clave compuesta
  buscar?: string[];               // columnas para ?q= (ilike)
  filtros?: string[];              // columnas permitidas como ?f.<col>=valor
  orden: [string, boolean];        // [columna, ascendente]
  ordenables?: string[];
  crear?: z.ZodObject;             // sin esquema = no se permite crear
  editar?: z.ZodObject;            // sin esquema = no se permite editar
  borrar?: "soft" | "hard";        // sin valor = no se permite borrar
  soloAdmin?: boolean;             // escritura solo del administrador
  autor?: string;                  // columna que se fija con el empleado actual al crear
  permiso?: string;                // permiso requerido para leer (chequeo previo; RLS decide)
}

const emp = (alias: string, fk: string) => `${alias}:empleados!${fk}(id,nombre,apellido,rol_sistema)`;
const depto = (fk: string) => `departamento:departamentos!${fk}(id,nombre,codigo)`;

const tarea = z.object({
  titulo: texto(200), descripcion: textoOpc(8000), proyecto_id: ref, departamento_id: ref, responsable_id: ref,
  padre_id: ref, prioridad: en(C.PRIORIDADES).optional(), estado: en(C.ESTADOS_TAREA).optional(),
  inicio: fecha, fin: fecha, duracion_estimada: numero(0, 100000), tiempo_real: numero(0, 100000),
  progreso: numero(0, 100), es_hito: z.boolean().optional(), orden: z.number().optional(),
});

const proyecto = z.object({
  nombre: texto(160), descripcion: textoOpc(8000), cliente_id: ref, departamento_id: ref, coordinador_id: ref,
  prioridad: en(C.PRIORIDADES).optional(), presupuesto: numero(), moneda: en(C.MONEDAS).optional(),
  inicio_plan: fecha, fin_plan: fecha, etapa: en(C.ETAPAS_PROYECTO).optional(), estado: en(C.ESTADOS_PROYECTO).optional(),
  avance: numero(0, 100),
});

const contacto = z.object({
  nombre: texto(80), apellido: z.string().trim().max(80).optional(), empresa: textoOpc(120), cargo: textoOpc(120),
  telefono: textoOpc(40), whatsapp: textoOpc(40), email, direccion: textoOpc(300), pais: textoOpc(80),
  tipo: en(C.TIPOS_CONTACTO).optional(), observaciones: textoOpc(4000), cliente_id: ref,
});

const empleado = z.object({
  nombre: texto(80), apellido: z.string().trim().max(80).optional(), email_corporativo: z.email("Correo inválido").max(254),
  telefono: textoOpc(40), departamento_id: ref, cargo_id: ref, supervisor_id: ref,
  rol_sistema: en(C.ROLES_SISTEMA), es_coordinador: z.boolean().optional(), fecha_ingreso: fecha, tipo_contrato: textoOpc(60),
  estado: z.enum(["activo", "inactivo"]).optional(),  // la desvinculación tiene su propio flujo
});

const oportunidad = z.object({
  titulo: texto(200), contacto_id: ref, cliente_id: ref, responsable_id: ref, etapa: en(C.ETAPAS_CRM).optional(),
  valor: numero(), moneda: en(C.MONEDAS).optional(), probabilidad: numero(0, 100), fuente: textoOpc(60),
  cierre_estimado: fecha, motivo_perdida: textoOpc(500), proyecto_id: ref, descripcion: textoOpc(4000), orden: z.number().optional(),
});

const ticket = z.object({
  titulo: texto(200), descripcion: textoOpc(8000), cliente_id: ref, proyecto_id: ref, categoria: textoOpc(60),
  prioridad: en(C.PRIORIDADES).optional(), responsable_id: ref, departamento_id: ref, estado: en(C.ESTADOS_TICKET).optional(),
});

const factura = z.object({
  numero: texto(40), tipo: z.enum(["emitida", "recibida"]), cliente_id: ref, contacto_id: ref, proyecto_id: ref,
  fecha_emision: fecha, fecha_vencimiento: fecha, moneda: en(C.MONEDAS).optional(),
  subtotal: z.coerce.number().min(0).max(1e12), impuesto: numero(), concepto: textoOpc(500),
  estado: z.enum(["borrador", "emitida", "anulada"]).optional(),
});

const kpi = z.object({
  nombre: texto(120), departamento_id: ref, formula: texto(500), meta: numero(-1e12), unidad: z.string().trim().min(1).max(20).optional(),
  sentido: z.enum(["mayor", "menor"]).optional(), fuente: textoOpc(120), periodicidad: en(C.PERIODICIDADES).optional(),
  responsable_id: ref, activo: z.boolean().optional(),
});

export const RECURSOS: Record<string, Recurso> = {
  departamentos: {
    tabla: "departamentos",
    select: `*, padre:padre_id(id,nombre), ${emp("coordinador", "departamentos_coordinador_fk")}`,
    buscar: ["nombre", "codigo"], filtros: ["padre_id", "activo"], orden: ["orden", true], soloAdmin: true,
    crear: z.object({ codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,12}$/, "Código: 2-12 letras/números"),
      nombre: texto(80), descripcion: textoOpc(500), padre_id: ref, coordinador_id: ref, orden: numero(0, 999), activo: z.boolean().optional() }),
    editar: z.object({ nombre: texto(80), descripcion: textoOpc(500), padre_id: ref, coordinador_id: ref,
      orden: numero(0, 999), activo: z.boolean() }).partial(),
  },
  cargos: {
    tabla: "cargos", select: `*, ${depto("cargos_departamento_id_fkey")}`, buscar: ["nombre"], filtros: ["departamento_id"],
    orden: ["nombre", true], soloAdmin: true, borrar: "hard",
    crear: z.object({ nombre: texto(80), departamento_id: ref, descripcion: textoOpc(500), activo: z.boolean().optional() }),
    editar: z.object({ nombre: texto(80), departamento_id: ref, descripcion: textoOpc(500), activo: z.boolean() }).partial(),
  },
  empleados: {
    tabla: "empleados",
    select: `*, ${depto("empleados_departamento_id_fkey")}, cargo:cargos!empleados_cargo_id_fkey(id,nombre), supervisor:supervisor_id(id,nombre,apellido)`,
    buscar: ["nombre", "apellido", "email_corporativo"], filtros: ["departamento_id", "estado", "rol_sistema", "es_coordinador", "cargo_id"],
    orden: ["nombre", true], ordenables: ["nombre", "fecha_ingreso", "estado", "created_at"],
    crear: empleado, editar: empleado.partial(), // directorio limitado por RLS (app.puede_ver_empleado)
  },
  empleado_datos: {
    tabla: "empleado_datos", select: "*", pk: "empleado_id", orden: ["empleado_id", true],
    crear: z.object({ empleado_id: id, datos: z.record(z.string(), z.string().max(500)) }),
    editar: z.object({ datos: z.record(z.string(), z.string().max(500)) }),
  },
  empleado_evaluaciones: {
    tabla: "empleado_evaluaciones", select: `*, ${emp("evaluador", "empleado_evaluaciones_evaluador_id_fkey")}`,
    filtros: ["empleado_id"], orden: ["created_at", false], autor: "evaluador_id",
    crear: z.object({ empleado_id: id, periodo: texto(20), puntaje: z.coerce.number().min(0).max(10), comentarios: textoOpc(4000) }),
  },
  permisos: { tabla: "permisos", select: "*", pk: "codigo", orden: ["modulo", true] },
  asignaciones_permiso: {
    tabla: "asignaciones_permiso", select: "*", filtros: ["sujeto_tipo", "sujeto_id", "permiso"], orden: ["permiso", true],
    soloAdmin: true, borrar: "hard",
    crear: z.object({ sujeto_tipo: z.enum(["rol", "coordinador", "departamento", "cargo", "empleado"]), sujeto_id: texto(60),
      permiso: texto(60), concedido: z.boolean().optional() }),
  },
  catalogos: {
    tabla: "catalogos", select: "*", buscar: ["valor"], filtros: ["tipo", "activo"], orden: ["orden", true], soloAdmin: true, borrar: "hard",
    crear: z.object({ tipo: z.string().regex(/^[a-z_]+$/), valor: texto(80), orden: numero(0, 999), activo: z.boolean().optional() }),
    editar: z.object({ valor: texto(80), orden: numero(0, 999), activo: z.boolean() }).partial(),
  },
  parametros: {
    tabla: "parametros", select: "*", pk: "clave", orden: ["clave", true], soloAdmin: true,
    editar: z.object({ valor: z.union([z.string().max(500), z.number(), z.boolean()]) }),
  },
  proyectos: {
    tabla: "proyectos",
    select: `id, codigo, nombre, descripcion, estado, etapa, prioridad, avance, presupuesto, moneda, inicio_plan, fin_plan,
      fecha_inicio, fecha_fin, cliente_id, departamento_id, coordinador_id, user_id, created_at, updated_at,
      cliente:clientes!proyectos_cliente_id_fkey(id,nombre,empresa), ${depto("proyectos_departamento_id_fkey")},
      ${emp("coordinador", "proyectos_coordinador_id_fkey")}`,
    buscar: ["nombre", "codigo"], filtros: ["estado", "etapa", "prioridad", "departamento_id", "cliente_id", "coordinador_id"],
    orden: ["created_at", false], ordenables: ["nombre", "codigo", "fin_plan", "prioridad", "etapa", "created_at"],
    crear: proyecto, editar: proyecto.partial(),
  },
  proyecto_equipo: {
    tabla: "proyecto_equipo", pk: ["proyecto_id", "empleado_id"],
    select: `*, ${emp("empleado", "proyecto_equipo_empleado_id_fkey")}`, filtros: ["proyecto_id", "empleado_id"],
    orden: ["created_at", true], borrar: "hard",
    crear: z.object({ proyecto_id: id, empleado_id: id, rol: textoOpc(60) }),
  },
  proyecto_hitos: {
    tabla: "proyecto_hitos", select: "*", filtros: ["proyecto_id", "completado"], orden: ["fecha", true], borrar: "hard",
    crear: z.object({ proyecto_id: id, nombre: texto(160), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completado: z.boolean().optional() }),
    editar: z.object({ nombre: texto(160), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completado: z.boolean() }).partial(),
  },
  proyecto_items: {
    tabla: "proyecto_items", select: `*, ${emp("autor", "proyecto_items_creado_por_fkey")}`,
    filtros: ["proyecto_id", "tipo", "estado"], orden: ["created_at", false], autor: "creado_por", borrar: "hard",
    crear: z.object({ proyecto_id: id, tipo: en(C.TIPOS_ITEM_PROYECTO), titulo: texto(200), descripcion: textoOpc(4000),
      estado: en(C.ESTADOS_ITEM).optional() }),
    editar: z.object({ titulo: texto(200), descripcion: textoOpc(4000), estado: en(C.ESTADOS_ITEM) }).partial(),
  },
  proyecto_contactos: {
    tabla: "proyecto_contactos", pk: ["proyecto_id", "contacto_id"],
    select: "*, contacto:contactos!proyecto_contactos_contacto_id_fkey(id,nombre,apellido,empresa,email,telefono)",
    filtros: ["proyecto_id", "contacto_id"], orden: ["proyecto_id", true], borrar: "hard",
    crear: z.object({ proyecto_id: id, contacto_id: id, rol: textoOpc(60) }),
  },
  proyecto_observaciones: {
    tabla: "proyecto_observaciones", select: "*", filtros: ["proyecto_id"], orden: ["created_at", false],
  },
  contactos: {
    tabla: "contactos", select: "*, cliente:clientes!contactos_cliente_id_fkey(id,nombre)",
    buscar: ["nombre", "apellido", "empresa", "email"], filtros: ["tipo", "cliente_id", "pais"],
    orden: ["nombre", true], ordenables: ["nombre", "empresa", "tipo", "created_at"], autor: "creado_por",
    crear: contacto, editar: contacto.partial(), borrar: "soft", permiso: "contactos.ver",
  },
  clientes: {
    tabla: "clientes", select: "*", buscar: ["nombre", "email", "empresa"], filtros: ["tipo", "suscrito"],
    orden: ["created_at", false], ordenables: ["nombre", "empresa", "created_at"], permiso: "clientes.ver",
    crear: z.object({ nombre: texto(120), email: z.email("Correo inválido").max(254), telefono: textoOpc(40),
      empresa: textoOpc(120), tipo: z.enum(["interesado", "fijo"]).optional(), servicio: textoOpc(120), notas: textoOpc(4000), suscrito: z.boolean().optional() }),
    editar: z.object({ nombre: texto(120), telefono: textoOpc(40), empresa: textoOpc(120),
      tipo: z.enum(["interesado", "fijo"]), servicio: textoOpc(120), notas: textoOpc(4000), suscrito: z.boolean() }).partial(),
  },
  tareas: {
    tabla: "tareas",
    select: `*, ${emp("responsable", "tareas_responsable_id_fkey")}, ${depto("tareas_departamento_id_fkey")},
      proyecto:proyectos!tareas_proyecto_id_fkey(id,codigo,nombre)`,
    buscar: ["titulo"], filtros: ["id", "estado", "prioridad", "proyecto_id", "departamento_id", "responsable_id", "padre_id", "es_hito"],
    orden: ["orden", true], ordenables: ["titulo", "fin", "inicio", "prioridad", "estado", "created_at", "orden"],
    crear: tarea, editar: tarea.partial(), borrar: "soft",
  },
  tarea_colaboradores: {
    tabla: "tarea_colaboradores", pk: ["tarea_id", "empleado_id"], select: `*, ${emp("empleado", "tarea_colaboradores_empleado_id_fkey")}`,
    filtros: ["tarea_id"], orden: ["tarea_id", true], borrar: "hard", crear: z.object({ tarea_id: id, empleado_id: id }),
  },
  tarea_checklist: {
    tabla: "tarea_checklist", select: "*", filtros: ["tarea_id"], orden: ["orden", true], borrar: "hard",
    crear: z.object({ tarea_id: id, texto: texto(200), orden: numero(0, 1e6) }),
    editar: z.object({ texto: texto(200), hecho: z.boolean(), orden: numero(0, 1e6) }).partial(),
  },
  tarea_comentarios: {
    tabla: "tarea_comentarios", select: `*, ${emp("autor", "tarea_comentarios_autor_id_fkey")}`, filtros: ["tarea_id"],
    orden: ["created_at", true], autor: "autor_id", crear: z.object({ tarea_id: id, texto: texto(4000) }),
  },
  tarea_dependencias: {
    tabla: "tarea_dependencias", pk: ["tarea_id", "depende_de"], select: "*", filtros: ["tarea_id", "depende_de"],
    orden: ["tarea_id", true], borrar: "hard", crear: z.object({ tarea_id: id, depende_de: id }),
  },
  oportunidades: {
    tabla: "oportunidades",
    select: `*, ${emp("responsable", "oportunidades_responsable_id_fkey")},
      contacto:contactos!oportunidades_contacto_id_fkey(id,nombre,apellido,empresa), cliente:clientes!oportunidades_cliente_id_fkey(id,nombre)`,
    buscar: ["titulo"], filtros: ["etapa", "responsable_id", "fuente", "contacto_id", "cliente_id"],
    orden: ["orden", true], ordenables: ["titulo", "valor", "cierre_estimado", "created_at", "orden"],
    autor: "creado_por", crear: oportunidad, editar: oportunidad.partial(), borrar: "soft",
  },
  crm_interacciones: {
    tabla: "crm_interacciones", select: `*, ${emp("autor", "crm_interacciones_autor_id_fkey")}`,
    filtros: ["oportunidad_id", "contacto_id", "hecho", "recordatorio"], orden: ["fecha", false], autor: "autor_id",
    crear: z.object({ oportunidad_id: ref, contacto_id: ref, tipo: en(C.TIPOS_INTERACCION), resumen: texto(2000),
      fecha: fechaHora, recordatorio: fechaHora }),
    editar: z.object({ hecho: z.boolean(), recordatorio: fechaHora }).partial(),
  },
  facturas: {
    tabla: "facturas",
    select: `*, cliente:clientes!facturas_cliente_id_fkey(id,nombre), contacto:contactos!facturas_contacto_id_fkey(id,nombre,apellido,empresa),
      proyecto:proyectos!facturas_proyecto_id_fkey(id,codigo,nombre)`,
    buscar: ["numero", "concepto"], filtros: ["tipo", "estado", "proyecto_id", "cliente_id", "contacto_id"],
    orden: ["fecha_emision", false], ordenables: ["numero", "fecha_emision", "fecha_vencimiento", "total"],
    autor: "creado_por", crear: factura, editar: factura.omit({ tipo: true }).partial(), borrar: "hard", permiso: "finanzas.ver",
  },
  pagos_factura: {
    tabla: "pagos_factura", select: "*", filtros: ["factura_id"], orden: ["fecha", false], permiso: "finanzas.ver",
    crear: z.object({ factura_id: id, fecha, monto: z.coerce.number().positive().max(1e12), metodo: textoOpc(60), referencia: textoOpc(120) }),
  },
  finanzas_registros: {
    tabla: "finanzas_registros",
    select: `*, proyecto:proyectos!finanzas_registros_proyecto_id_fkey(id,codigo,nombre), ${depto("finanzas_registros_departamento_id_fkey")},
      contacto:contactos!finanzas_registros_contacto_id_fkey(id,nombre,apellido,empresa)`,
    buscar: ["descripcion", "categoria"], filtros: ["tipo", "categoria", "proyecto_id", "departamento_id", "anulado"],
    orden: ["fecha", false], ordenables: ["fecha", "monto", "categoria"], autor: "creado_por", permiso: "finanzas.ver",
    crear: z.object({ tipo: z.enum(["ingreso", "gasto"]), categoria: texto(60), descripcion: texto(300),
      monto: z.coerce.number().positive().max(1e12), moneda: en(C.MONEDAS).optional(), fecha, proyecto_id: ref,
      departamento_id: ref, contacto_id: ref, factura_id: ref }),
    editar: z.object({ anulado: z.literal(true), motivo_anulacion: texto(300) }),
  },
  presupuestos_gestion: {
    tabla: "presupuestos_gestion",
    select: `*, ${depto("presupuestos_gestion_departamento_id_fkey")}, proyecto:proyectos!presupuestos_gestion_proyecto_id_fkey(id,codigo,nombre)`,
    filtros: ["departamento_id", "proyecto_id"], orden: ["periodo_inicio", false], borrar: "hard", permiso: "finanzas.ver",
    crear: z.object({ nombre: texto(120), departamento_id: ref, proyecto_id: ref, categoria: textoOpc(60),
      periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodo_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      monto: z.coerce.number().min(0).max(1e12), moneda: en(C.MONEDAS).optional() }),
    editar: z.object({ nombre: texto(120), monto: z.coerce.number().min(0).max(1e12), categoria: textoOpc(60) }).partial(),
  },
  movimientos: {
    tabla: "movimientos", select: "id, user_id, proyecto_id, tipo, monto, metodo, referencia, descripcion, created_at",
    filtros: ["tipo", "proyecto_id"], orden: ["created_at", false], permiso: "finanzas.ver",
  },
  tickets: {
    tabla: "tickets",
    select: `*, ${emp("responsable", "tickets_responsable_id_fkey")}, cliente:clientes!tickets_cliente_id_fkey(id,nombre),
      proyecto:proyectos!tickets_proyecto_id_fkey(id,codigo,nombre), ${depto("tickets_departamento_id_fkey")}`,
    buscar: ["titulo"], filtros: ["estado", "prioridad", "categoria", "responsable_id", "departamento_id", "cliente_id", "proyecto_id"],
    orden: ["created_at", false], ordenables: ["numero", "prioridad", "estado", "created_at"],
    crear: ticket, editar: ticket.partial(),
  },
  ticket_comentarios: {
    tabla: "ticket_comentarios", select: `*, ${emp("autor", "ticket_comentarios_autor_id_fkey")}`, filtros: ["ticket_id"],
    orden: ["created_at", true], autor: "autor_id", crear: z.object({ ticket_id: id, texto: texto(4000) }),
  },
  kpis: {
    tabla: "kpis", select: `*, ${depto("kpis_departamento_id_fkey")}, ${emp("responsable", "kpis_responsable_id_fkey")}`,
    buscar: ["nombre"], filtros: ["departamento_id", "activo"], orden: ["nombre", true], permiso: "kpi.ver",
    crear: kpi, editar: kpi.partial(),
  },
  kpi_mediciones: {
    tabla: "kpi_mediciones", select: "*", filtros: ["kpi_id"], orden: ["periodo", false], autor: "registrado_por",
    borrar: "hard", permiso: "kpi.ver",
    crear: z.object({ kpi_id: id, periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), valor: z.coerce.number(), nota: textoOpc(500) }),
  },
  documentos_area: {
    tabla: "documentos_area",
    select: `*, proyecto:proyectos!documentos_area_proyecto_id_fkey(id,codigo,nombre), cliente:clientes!documentos_area_cliente_id_fkey(id,nombre),
      ${emp("responsable", "documentos_area_responsable_id_fkey")}, ${emp("autor", "documentos_area_autor_id_fkey")}`,
    buscar: ["titulo"], filtros: ["area", "tipo", "estado", "proyecto_id", "responsable_id", "cliente_id"],
    orden: ["created_at", false], ordenables: ["titulo", "fecha", "estado", "created_at"], autor: "autor_id", borrar: "hard",
    crear: z.object({ area: z.enum(["comercializacion", "finanzas", "talento", "devops", "consultoria", "legal"]), tipo: texto(40),
      titulo: texto(200), contenido: textoOpc(20000), estado: texto(20).optional(), fecha: fechaHora, proyecto_id: ref, cliente_id: ref,
      responsable_id: ref, datos: z.record(z.string(), z.union([z.string().max(2000), z.number()])).optional() }),
    editar: z.object({ titulo: texto(200), contenido: textoOpc(20000), estado: texto(20), fecha: fechaHora, proyecto_id: ref, cliente_id: ref,
      responsable_id: ref, datos: z.record(z.string(), z.union([z.string().max(2000), z.number()])) }).partial(),
  },
  archivos_gestion: {
    tabla: "archivos_gestion", select: `id, entidad, entidad_id, nombre, mime, tamano, created_at, ${emp("autor", "archivos_gestion_subido_por_fkey")}`,
    filtros: ["entidad", "entidad_id"], orden: ["created_at", false],
  },
  auditoria: {
    tabla: "auditoria", select: "id, actor_id, accion, entidad, entidad_id, cambios, created_at",
    filtros: ["entidad", "entidad_id", "accion", "actor_id"], orden: ["created_at", false], permiso: "auditoria.ver",
  },
};

/** Traduce errores de Postgres/PostgREST a mensajes comprensibles. */
export function mensajeError(e: { code?: string; message?: string } | null | undefined): [string, number] {
  const code = e?.code ?? "";
  const msg = e?.message ?? "Error inesperado";
  if (code === "PGRST116") return ["No encontrado o sin permiso para modificarlo", 404];
  if (code === "42501") return [/row-level security/i.test(msg) ? "No tienes permiso para esta acción" : msg, 403];
  if (code === "23505") return ["Ya existe un registro con esos datos (duplicado)", 409];
  if (code === "23503") return ["El registro está relacionado con otros datos y no puede quedar inconsistente", 409];
  if (code === "23514" || code === "P0001") return [msg.replace(/^.*violates check constraint.*$/, "Algún dato no cumple las reglas del sistema"), 422];
  if (code === "22P02" || code === "22007") return ["Formato de dato inválido", 400];
  return ["No se pudo completar la operación", 500];
}

export function resolver(nombre: string): Recurso | null {
  return Object.prototype.hasOwnProperty.call(RECURSOS, nombre) ? RECURSOS[nombre] : null;
}
