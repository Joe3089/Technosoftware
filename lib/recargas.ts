import { createAdminClient } from "@/lib/supabase/server";
import { obtenerOrden, capturarOrden, capturaDe, type Captura } from "@/lib/paypal";

export interface Recarga {
  id: string;
  user_id: string;
  monto: number | string;
  moneda: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "cancelado" | "error";
  order_id: string | null;
  detalle: string | null;
  created_at: string;
}

const FINAL = ["aprobado", "rechazado", "cancelado"];

async function marcar(id: string, estado: Recarga["estado"], detalle: string | null) {
  const { data } = await createAdminClient().from("recargas")
    .update({ estado, detalle, updated_at: new Date().toISOString() })
    .eq("id", id).neq("estado", "aprobado")          // an approved top-up never goes back
    .select().maybeSingle();
  return data as Recarga | null;
}

/**
 * Reconciles a top-up with PayPal's real order state (never with what the browser says).
 * Captures approved orders and credits the wallet only on a COMPLETED capture.
 * Safe to call repeatedly from the return page and from webhooks.
 */
export async function sincronizarRecarga(rec: Recarga, { cancelar = false } = {}): Promise<Recarga> {
  if (FINAL.includes(rec.estado) || !rec.order_id) return rec;

  const orden = await obtenerOrden(rec.order_id);
  if (orden.status !== 200) return (await marcar(rec.id, "error", "No se pudo consultar el pago en PayPal")) ?? rec;

  let captura: Captura | null = capturaDe(orden.body);
  if (!captura && orden.body.status === "APPROVED") {
    const cap = await capturarOrden(rec.order_id, rec.id);
    captura = capturaDe(cap.body);
    if (!captura) {
      const issue = cap.body?.details?.[0]?.issue;
      if (issue === "INSTRUMENT_DECLINED" || issue === "PAYER_ACTION_REQUIRED")
        return (await marcar(rec.id, "rechazado", "PayPal rechazó el método de pago")) ?? rec;
      return (await marcar(rec.id, "error", "PayPal no pudo completar el cobro")) ?? rec;
    }
  }

  if (captura?.estado === "COMPLETED") {
    const { data, error } = await createAdminClient().rpc("acreditar_recarga", {
      p_recarga: rec.id, p_capture: captura.captureId, p_monto: captura.monto, p_moneda: captura.moneda,
    });
    if (error) return (await marcar(rec.id, "error", "Pago confirmado pero no se pudo acreditar; contacta a soporte")) ?? rec;
    return data as Recarga;
  }
  if (captura?.estado === "PENDING") return (await marcar(rec.id, "pendiente", "PayPal está revisando el pago")) ?? rec;
  if (captura && ["DECLINED", "FAILED"].includes(captura.estado))
    return (await marcar(rec.id, "rechazado", "El pago fue rechazado")) ?? rec;
  if (orden.body.status === "VOIDED") return (await marcar(rec.id, "cancelado", "La orden fue anulada")) ?? rec;

  // Not approved by the payer yet (CREATED / PAYER_ACTION_REQUIRED)
  if (cancelar) return (await marcar(rec.id, "cancelado", "Pago cancelado por el usuario")) ?? rec;
  return rec;
}
