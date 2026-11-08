import { json } from "@/lib/api";
import { mensajeError } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";

// Tablas auditadas que se pueden consultar y cómo nombrar sus registros
const ETIQUETA: Record<string, { cols: string; txt: (r: Record<string, string>) => string }> = {
  tareas: { cols: "id, titulo", txt: (r) => r.titulo },
  proyectos: { cols: "id, codigo, nombre", txt: (r) => `${r.codigo} · ${r.nombre}` },
  contactos: { cols: "id, nombre, apellido", txt: (r) => `${r.nombre} ${r.apellido ?? ""}`.trim() },
  clientes: { cols: "id, nombre", txt: (r) => r.nombre },
  oportunidades: { cols: "id, titulo", txt: (r) => r.titulo },
  facturas: { cols: "id, numero", txt: (r) => `Factura ${r.numero}` },
  tickets: { cols: "id, numero, titulo", txt: (r) => `#${r.numero} · ${r.titulo}` },
  kpis: { cols: "id, nombre", txt: (r) => r.nombre },
  empleados: { cols: "id, nombre, apellido", txt: (r) => `${r.nombre} ${r.apellido ?? ""}`.trim() },
  presupuestos_gestion: { cols: "id, nombre", txt: (r) => r.nombre },
  finanzas_registros: { cols: "id, categoria", txt: (r) => r.categoria },
  departamentos: { cols: "id, nombre", txt: (r) => r.nombre },
  documentos_area: { cols: "id, titulo", txt: (r) => r.titulo },
  cargos: { cols: "id, nombre", txt: (r) => r.nombre },
};
const AUDITADAS = new Set([...Object.keys(ETIQUETA), "tarea_checklist", "tarea_comentarios", "tarea_colaboradores", "tarea_dependencias",
  "proyecto_equipo", "proyecto_hitos", "proyecto_items", "proyecto_contactos", "crm_interacciones", "ticket_comentarios",
  "empleado_evaluaciones", "empleado_datos", "pagos_factura", "kpi_mediciones", "movimientos", "archivos_gestion",
  "asignaciones_permiso", "catalogos", "parametros", "profiles"]);

type Ev = { id: number; actor_id: string | null; accion: string; entidad: string; entidad_id: string | null; padre: string | null;
  padre_id: string | null; cambios: Record<string, unknown> | null; created_at: string };

// GET /api/gestion/historial?entidades=a,b[&id=uuid]&page=1
// Con id: historial de un registro (incluye sus hijos). Sin id: historial del área (todas las entidades indicadas).
// RLS de auditoria limita a lo que el usuario puede ver en su área.
export async function GET(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const sp = new URL(req.url).searchParams;
  const entidades = (sp.get("entidades") ?? "").split(",").filter((e) => AUDITADAS.has(e)).slice(0, 20);
  if (!entidades.length) return json({ error: "Indica las entidades" }, 400);
  const id = sp.get("id");
  const page = Math.max(Number(sp.get("page")) || 1, 1), size = 40;
  const lista = entidades.join(",");

  let q = auth.db.from("auditoria").select("id, actor_id, accion, entidad, entidad_id, padre, padre_id, cambios, created_at", { count: "exact" });
  if (id) {
    if (!esUuid(id)) return json({ error: "Registro inválido" }, 400);
    q = q.or(`and(entidad.in.(${lista}),entidad_id.eq.${id}),and(padre.in.(${lista}),padre_id.eq.${id})`);
  } else q = q.or(`entidad.in.(${lista}),padre.in.(${lista})`);
  const { data, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  const eventos = (data ?? []) as Ev[];

  // Nombres de quienes hicieron los cambios (solo de eventos que el usuario ya puede ver)
  const actores = [...new Set(eventos.map((e) => e.actor_id).filter(Boolean))] as string[];
  const nombres: Record<string, string> = {};
  if (actores.length) {
    const { data: p } = await createAdminClient().from("profiles").select("id, full_name, email, role").in("id", actores);
    for (const x of p ?? []) nombres[x.id] = x.role === "admin" ? `${x.full_name ?? "Administrador"} (Administrador General)` : x.full_name ?? x.email;
  }

  // Nombre legible de cada registro (consultado con la sesión: RLS)
  const ids: Record<string, Set<string>> = {};
  for (const e of eventos) {
    const t = e.padre ?? e.entidad, i = e.padre_id ?? e.entidad_id;
    if (ETIQUETA[t] && i && esUuid(i)) (ids[t] ??= new Set()).add(i);
  }
  const etiquetas: Record<string, string> = {};
  await Promise.all(Object.entries(ids).map(async ([t, s]) => {
    const { data: filas } = await auth.db.from(t).select(ETIQUETA[t].cols).in("id", [...s].slice(0, 200));
    for (const f of (filas ?? []) as unknown as Record<string, string>[]) etiquetas[f.id] = ETIQUETA[t].txt(f);
  }));

  return json({
    total: count ?? 0, page, size,
    datos: eventos.map((e) => ({
      ...e,
      actor: e.actor_id ? nombres[e.actor_id] ?? "Usuario" : "Sistema",
      registro: etiquetas[e.padre_id ?? e.entidad_id ?? ""] ?? null,
    })),
  });
}
