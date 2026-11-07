import { requireRole, json } from "@/lib/api";
import { calcularBilletera } from "@/lib/billetera";

// GET /api/billetera?usuario=<uuid> — estado de cuenta calculado desde el libro de movimientos
export async function GET(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, role, supabase } = auth.session;
  const pedido = new URL(req.url).searchParams.get("usuario");
  const objetivo = role === "admin" && pedido ? pedido : user.id;

  const [proy, movs] = await Promise.all([
    supabase.from("proyectos").select("id, nombre, estado").eq("user_id", objetivo).order("created_at"),
    supabase.from("movimientos")
      .select("id, proyecto_id, tipo, monto, metodo, referencia, descripcion, created_at")
      .eq("user_id", objetivo).order("created_at", { ascending: false }),
  ]);
  if (proy.error || movs.error) return json({ error: (proy.error ?? movs.error)!.message }, 500);

  return json({ ...calcularBilletera(movs.data, proy.data), movimientos: movs.data, moneda: "USD" });
}
