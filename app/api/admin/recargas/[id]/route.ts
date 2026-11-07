import { NextResponse } from "next/server";
import { requireRole, json, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";
import { after } from "next/server";
import { conciliarRecarga } from "@/lib/conciliacion";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/recargas/:id — abre el comprobante (URL firmada de 5 min)
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data } = await auth.session.supabase.from("recargas").select("comprobante_path").eq("id", id).maybeSingle();
  if (!data?.comprobante_path) return json({ error: "Sin comprobante" }, 404);
  const { data: s } = await createAdminClient().storage.from("adjuntos").createSignedUrl(data.comprobante_path, 300);
  return s ? NextResponse.redirect(s.signedUrl) : json({ error: "No se pudo abrir" }, 500);
}

// POST /api/admin/recargas/:id { accion: "aprobar" | "rechazar", motivo? }
// Aprobar acredita el saldo de forma atómica e idempotente (acreditar_recarga).
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { accion, motivo } = await req.json().catch(() => ({}));
  if (accion !== "aprobar" && accion !== "rechazar") return json({ error: "Acción inválida" }, 400);

  const admin = createAdminClient();
  const { data: rec } = await admin.from("recargas").select("*").eq("id", id).maybeSingle();
  if (!rec || rec.metodo === "paypal") return json({ error: "Recarga no encontrada" }, 404);
  if (rec.estado !== "pendiente") return json({ error: `La recarga ya está ${rec.estado}` }, 409);

  if (accion === "aprobar") {
    const { data, error } = await admin.rpc("acreditar_recarga", {
      p_recarga: id, p_capture: `MANUAL-${id}`, p_monto: rec.monto, p_moneda: rec.moneda,
    });
    if (error) return json({ error: "No se pudo acreditar" }, 500);
    await admin.from("recargas").update({ revisado_por: auth.session.user.id }).eq("id", id);
    // Once administration has approved, the AI reconciles it against the wallet (after the response)
    after(() => conciliarRecarga(id).catch((e) => console.error("[conciliar]", e?.message)));
    return json({ recarga: data });
  }

  const detalle = `Pago no verificado${str(motivo, 300) ? `: ${str(motivo, 300)}` : ""}`;
  const { data, error } = await admin.from("recargas")
    .update({ estado: "rechazado", detalle, revisado_por: auth.session.user.id, updated_at: new Date().toISOString() })
    .eq("id", id).eq("estado", "pendiente").select().single();
  if (error) return json({ error: "No se pudo actualizar" }, 409);
  await registrarActividad({
    userId: rec.user_id, actorId: auth.session.user.id, accion: "recarga_rechazado", entidad: "recarga", entidadId: id,
    descripcion: `Recarga de ${Number(rec.monto).toFixed(2)} USD rechazada: ${detalle}`,
  });
  return json({ recarga: data });
}
