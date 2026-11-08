import { json } from "@/lib/api";
import { requireAcceso } from "@/lib/permissions";

// GET /api/admin/recargas?estado=pendiente — pagos manuales reportados (solo admin)
export async function GET(req: Request) {
  const auth = await requireAcceso("pagos.verificar");
  if ("error" in auth) return auth.error;
  const estado = new URL(req.url).searchParams.get("estado") ?? "pendiente";
  let q = auth.session.supabase.from("recargas")
    .select("id, monto, moneda, estado, detalle, metodo, referencia, fecha_pago, monto_origen, moneda_origen, comprobante_path, conciliacion, created_at, cliente:profiles!recargas_user_id_fkey(email, full_name), metodo_info:metodos_pago(nombre)")
    .neq("metodo", "paypal").order("created_at", { ascending: false }).limit(100);
  if (estado !== "todas") q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);
  return json({ recargas: data.map(({ comprobante_path, ...r }) => ({ ...r, tieneComprobante: !!comprobante_path })) });
}
