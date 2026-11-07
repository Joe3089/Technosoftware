import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { CAMPOS_METODO, datosCompletos, type MetodoId } from "@/lib/pagos";
import { paypalConfigurado } from "@/lib/paypal";

// PATCH /api/metodos-pago/:id { activo?, datos?, instrucciones? } — solo admin
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!(id in CAMPOS_METODO)) return json({ error: "Método inexistente" }, 404);
  const body = await req.json().catch(() => ({}));
  const s = auth.session.supabase;

  const { data: actual } = await s.from("metodos_pago").select("*").eq("id", id).single();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.datos && typeof body.datos === "object") {
    const datos: Record<string, string> = {};
    for (const [k] of CAMPOS_METODO[id as MetodoId]) datos[k] = str(body.datos[k], 160) ?? "";
    update.datos = datos;
  }
  if ("instrucciones" in body) update.instrucciones = str(body.instrucciones, 1000);
  if ("activo" in body) {
    const activo = Boolean(body.activo);
    const datos = (update.datos ?? actual?.datos ?? {}) as Record<string, string>;
    if (activo && actual?.tipo === "manual" && !datosCompletos({ id: id as MetodoId, datos }))
      return json({ error: "Completa los datos obligatorios de la cuenta antes de activarlo" }, 400);
    if (activo && id === "paypal" && !paypalConfigurado())
      return json({ error: "Faltan las credenciales de PayPal en el servidor (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)" }, 400);
    update.activo = activo;
  }

  const { data, error } = await s.from("metodos_pago").update(update).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 400);
  await registrarActividad({
    userId: auth.session.user.id, accion: "metodo_pago_actualizado",
    descripcion: `Actualizó el método de pago ${data.nombre}${"activo" in body ? (data.activo ? " (activado)" : " (desactivado)") : ""}`,
    entidad: "metodo_pago", entidadId: id,
  });
  return json({ metodo: data });
}
