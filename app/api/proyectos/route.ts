import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { ESTADOS_PROYECTO, GRUPOS, ESTADOS_ACTIVOS, type Grupo } from "@/lib/proyectos";
import { camposSeguimiento } from "./campos";

const PAGE = 12;
const COLS = "id, nombre, descripcion, estado, fase, avance, responsable, fecha_inicio, fecha_fin, created_at, updated_at";

// GET /api/proyectos?grupo=<grupo|activos>&q=<texto>&pagina=<n>
// Usuarios: solo sus proyectos (RLS). Admin: todos, con el cliente.
export async function GET(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { supabase, role } = auth.session;
  const sp = new URL(req.url).searchParams;
  const grupo = sp.get("grupo");
  const q = sp.get("q")?.replace(/[%,()*]/g, "").trim().slice(0, 80);
  const pagina = Math.max(0, Number.parseInt(sp.get("pagina") ?? "0", 10) || 0);

  const estados = grupo === "activos" ? ESTADOS_ACTIVOS
    : grupo && grupo in GRUPOS ? [...GRUPOS[grupo as Grupo].estados] : null;

  const cols = role === "admin" ? `${COLS}, cliente:profiles!proyectos_user_id_fkey(email, full_name)` : COLS;
  let query = supabase.from("proyectos").select(cols, { count: "exact" });
  if (estados) query = query.in("estado", estados);
  if (q) query = query.ilike("nombre", `%${q}%`);
  query = grupo === "culminados"
    ? query.order("fecha_fin", { ascending: false, nullsFirst: false })
    : query.order("updated_at", { ascending: false });
  query = query.order("id").range(pagina * PAGE, pagina * PAGE + PAGE - 1);

  // Counts per group for the filter chips (same visibility rules)
  const conteos = Object.fromEntries(await Promise.all(
    (Object.keys(GRUPOS) as Grupo[]).map(async (g) => {
      let c = supabase.from("proyectos").select("id", { count: "exact", head: true }).in("estado", [...GRUPOS[g].estados]);
      if (q) c = c.ilike("nombre", `%${q}%`);
      return [g, (await c).count ?? 0];
    })
  ));

  const { data, count, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ proyectos: data, total: count ?? 0, pagina, hayMas: (pagina + 1) * PAGE < (count ?? 0), conteos });
}

// POST /api/proyectos — solo admin crea proyectos para un cliente registrado
export async function POST(req: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const nombre = str(body.nombre, 120);
  if (!nombre || typeof body.user_id !== "string") return json({ error: "user_id y nombre son obligatorios" }, 400);
  const extra = camposSeguimiento(body);
  if ("error" in extra) return json({ error: extra.error }, 400);

  const { data, error } = await auth.session.supabase.from("proyectos").insert({
    user_id: body.user_id, nombre, descripcion: str(body.descripcion, 2000),
    estado: ESTADOS_PROYECTO.includes(body.estado) ? body.estado : "pendiente",
    ...extra.campos,
  }).select().single();
  if (error) return json({ error: error.message }, 400);

  await registrarActividad({
    userId: data.user_id, actorId: auth.session.user.id, accion: "proyecto_creado",
    descripcion: `Proyecto «${data.nombre}» creado`, entidad: "proyecto", entidadId: data.id,
  });
  return json({ proyecto: data }, 201);
}
