import { requireRole, json, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/movimientos — solo admin. La validación de saldo, el registro y la
// auditoría ocurren en una sola transacción dentro de registrar_movimiento().
export async function POST(req: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const monto = Number(body.monto);
  if (typeof body.user_id !== "string" || !Number.isFinite(monto) || monto <= 0)
    return json({ error: "user_id y un monto mayor que 0 son obligatorios" }, 400);

  const { data, error } = await createAdminClient().rpc("registrar_movimiento", {
    p_user: body.user_id, p_tipo: body.tipo, p_monto: monto,
    p_proyecto: typeof body.proyecto_id === "string" ? body.proyecto_id : null,
    p_metodo: str(body.metodo, 40), p_referencia: str(body.referencia, 120),
    p_descripcion: str(body.descripcion, 300), p_actor: auth.session.user.id,
  });
  if (error) return json({ error: error.message }, 400);
  return json({ movimiento: data }, 201);
}
