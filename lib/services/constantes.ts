// Catálogos fijos del módulo de gestión (reflejan los CHECK de la migración 010).
// Compartido por cliente y servidor.

export type Opcion = { valor: string; etiqueta: string; color?: string };
const op = (valor: string, etiqueta: string, color?: string): Opcion => ({ valor, etiqueta, color });

export const ESTADOS_TAREA = [
  op("por_hacer", "Por hacer", "#9aafd4"),
  op("en_progreso", "En progreso", "#4d7fff"),
  op("en_revision", "En revisión", "#b388ff"),
  op("bloqueada", "Bloqueada", "#ff5370"),
  op("completada", "Completada", "#00e676"),
  op("cancelada", "Cancelada", "#5c6b8a"),
];

export const PRIORIDADES = [
  op("baja", "Baja", "#5c6b8a"),
  op("media", "Media", "#4d7fff"),
  op("alta", "Alta", "#ffb300"),
  op("urgente", "Urgente", "#ff5370"),
];

export const ETAPAS_PROYECTO = [
  op("prospeccion", "Prospección"), op("calificacion", "Calificación"), op("descubrimiento", "Descubrimiento"),
  op("propuesta", "Propuesta"), op("contrato", "Contrato"), op("arquitectura", "Arquitectura"),
  op("desarrollo_qa", "Desarrollo y QA"), op("implementacion", "Implementación"), op("capacitacion", "Capacitación"),
  op("facturacion", "Facturación"), op("soporte", "Soporte y evolución"),
];

// Estado operativo existente de public.proyectos (no se cambia)
export const ESTADOS_PROYECTO = [
  op("pendiente", "Pendiente", "#9aafd4"),
  op("en_progreso", "En progreso", "#4d7fff"),
  op("revision", "En revisión", "#b388ff"),
  op("completado", "Culminado", "#00e676"),
  op("cancelado", "Cancelado", "#5c6b8a"),
];

export const ETAPAS_CRM = [
  op("nuevo", "Lead nuevo", "#9aafd4"),
  op("contactado", "Contactado", "#4d7fff"),
  op("calificado", "Calificado", "#00cfff"),
  op("propuesta", "Propuesta enviada", "#b388ff"),
  op("negociacion", "Negociación", "#ffb300"),
  op("ganado", "Ganado", "#00e676"),
  op("perdido", "Perdido", "#ff5370"),
];

export const ESTADOS_TICKET = [
  op("abierto", "Abierto", "#9aafd4"),
  op("asignado", "Asignado", "#4d7fff"),
  op("en_proceso", "En proceso", "#00cfff"),
  op("en_espera", "En espera", "#ffb300"),
  op("resuelto", "Resuelto", "#00e676"),
  op("cerrado", "Cerrado", "#5c6b8a"),
];

export const TIPOS_CONTACTO = [
  op("cliente", "Cliente"), op("prospecto", "Prospecto"), op("proveedor", "Proveedor"),
  op("socio", "Socio"), op("contacto", "Contacto empresarial"), op("otro", "Otros"),
];

export const ESTADOS_EMPLEADO = [
  op("activo", "Activo", "#00e676"), op("inactivo", "Inactivo", "#ffb300"), op("desvinculado", "Desvinculado", "#ff5370"),
];

// Roles de sistema del personal (ficha del empleado). «Usuario» es el rol de los clientes:
// se asigna solo al registrarse y nunca aparece en la ficha.
export const ROLES_SISTEMA = [
  op("admin_general", "Administrador General", "#00cfff"), op("comercializacion", "Comercialización", "#ffb300"),
  op("finanzas", "Finanzas", "#00e676"), op("talento", "Talento", "#b388ff"), op("devops", "DevOps", "#4d7fff"),
  op("consultoria", "Consultoría", "#ff8a65"), op("legal", "Legal", "#9aafd4"),
];
export const ROL_USUARIO = op("usuario", "Usuario (cliente)");

export const TIPOS_INTERACCION = [
  op("llamada", "Llamada"), op("correo", "Correo"), op("reunion", "Reunión"), op("whatsapp", "WhatsApp"), op("nota", "Nota"),
];

export const TIPOS_ITEM_PROYECTO = [
  op("requerimiento", "Requerimiento"), op("entregable", "Entregable"), op("incidencia", "Incidencia"), op("documento", "Documentación"),
];
export const ESTADOS_ITEM = [op("pendiente", "Pendiente"), op("en_curso", "En curso"), op("cumplido", "Cumplido"), op("descartado", "Descartado")];

export const ESTADOS_FACTURA = [
  op("borrador", "Borrador", "#9aafd4"), op("emitida", "Emitida", "#4d7fff"), op("parcial", "Pago parcial", "#ffb300"),
  op("pagada", "Pagada", "#00e676"), op("anulada", "Anulada", "#5c6b8a"),
];

export const PERIODICIDADES = [op("semanal", "Semanal"), op("mensual", "Mensual"), op("trimestral", "Trimestral"), op("anual", "Anual")];

export const MONEDAS = [op("USD", "USD"), op("VES", "VES"), op("EUR", "EUR")];

export const valores = (o: Opcion[]) => o.map((x) => x.valor) as [string, ...string[]];
export const etiqueta = (o: Opcion[], v: string | null | undefined) => o.find((x) => x.valor === v)?.etiqueta ?? v ?? "—";
export const color = (o: Opcion[], v: string | null | undefined) => o.find((x) => x.valor === v)?.color ?? "#9aafd4";

export const nombreEmpleado = (e?: { nombre?: string | null; apellido?: string | null } | null) =>
  e ? `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim() || "—" : "—";

export const etiquetaRol = (rol: string | null | undefined, coordinador?: boolean) =>
  rol === "admin" ? "Administrador General" : `${etiqueta(ROLES_SISTEMA, rol)}${coordinador ? " · Coordinador" : ""}`;
