import { json } from "@/lib/api";
import { mensajeError } from "@/lib/gestion/recursos";
import { requireStaff, esUuid } from "@/lib/gestion/servidor";

// GET /api/gestion/notificaciones — últimas 30 propias
export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.db.from("notificaciones").select("*").order("created_at", { ascending: false }).limit(30);
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  return json({ datos: data });
}

// PATCH /api/gestion/notificaciones { ids?: string[] } — marca como leídas (todas si no se indican)
export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  let q = auth.db.from("notificaciones").update({ leida_at: new Date().toISOString() }).is("leida_at", null);
  if (Array.isArray(body.ids)) q = q.in("id", body.ids.filter(esUuid).slice(0, 100));
  const { error } = await q;
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  return json({ ok: true });
}
