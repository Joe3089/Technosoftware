import { requireRole, json, isEmail, str } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/clientes/:id — solo admin
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, max] of [["nombre", 120], ["telefono", 40], ["empresa", 120], ["servicio", 120], ["notas", 2000]] as const)
    if (k in body) update[k] = str(body[k], max);
  if ("email" in body) {
    if (!isEmail(body.email)) return json({ error: "Correo inválido" }, 400);
    update.email = body.email.toLowerCase();
  }
  if ("tipo" in body && ["interesado", "fijo"].includes(body.tipo)) update.tipo = body.tipo;
  if ("suscrito" in body) update.suscrito = Boolean(body.suscrito);

  const { data, error } = await auth.session.supabase.from("clientes").update(update).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ cliente: data });
}

// DELETE /api/clientes/:id — solo admin
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { error } = await auth.session.supabase.from("clientes").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
