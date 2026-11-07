import { requireRole, json } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";

const PAGE = 20;

// GET /api/actividad?antes=<id>&usuario=<uuid> — historial paginado (más reciente primero).
// "usuario" solo lo puede usar un admin; RLS lo refuerza en la base de datos.
export async function GET(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, role, supabase } = auth.session;
  const { searchParams } = new URL(req.url);
  const pedido = searchParams.get("usuario");
  const objetivo = role === "admin" && pedido ? pedido : user.id;
  const antes = Number(searchParams.get("antes"));

  let q = supabase.from("actividad")
    .select("id, accion, descripcion, entidad, entidad_id, actor_id, created_at")
    .eq("user_id", objetivo)
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (Number.isInteger(antes) && antes > 0) q = q.lt("id", antes);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);
  return json({ eventos: data.slice(0, PAGE), hayMas: data.length > PAGE });
}

// POST /api/actividad — único evento que inicia el cliente: el cierre de sesión.
// El usuario sale de la sesión verificada en el servidor, no del cuerpo.
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  if (body?.accion !== "cierre_sesion") return json({ error: "Acción no permitida" }, 400);
  await registrarActividad({
    userId: auth.session.user.id, accion: "cierre_sesion", descripcion: "Cierre de sesión", entidad: "sesion",
  });
  return json({ ok: true });
}
