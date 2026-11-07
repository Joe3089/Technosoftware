import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { verificarWebhook } from "@/lib/paypal";
import { sincronizarRecarga, type Recarga } from "@/lib/recargas";

const EVENTOS = ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.PENDING"];

// POST /api/webhooks/paypal — eventos firmados por PayPal.
// No se usa el importe del evento: se re-consulta la orden en PayPal y se acredita de forma idempotente.
export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  if (!event || !(await verificarWebhook(req.headers, event))) return json({ error: "Firma inválida" }, 401);
  if (!EVENTOS.includes(event.event_type)) return json({ ok: true, ignorado: true });

  const orderId: string | undefined = event.event_type.startsWith("CHECKOUT.ORDER")
    ? event.resource?.id
    : event.resource?.supplementary_data?.related_ids?.order_id;
  if (!orderId) return json({ ok: true, ignorado: true });

  const { data: rec } = await createAdminClient().from("recargas").select("*").eq("order_id", orderId).maybeSingle();
  if (!rec) return json({ ok: true, ignorado: true });

  try {
    const r = await sincronizarRecarga(rec as Recarga);
    return json({ ok: true, estado: r.estado });
  } catch {
    return json({ error: "reintentar" }, 500); // PayPal reintentará el envío
  }
}
