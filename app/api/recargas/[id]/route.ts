import { requireRole, json } from "@/lib/api";
import { sincronizarRecarga, type Recarga } from "@/lib/recargas";
import { registrarActividad } from "@/lib/actividad";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/recargas/:id { accion: "confirmar" | "cancelar" }
// Se llama al volver de PayPal. El resultado sale de PayPal, no de la URL de retorno.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;
  const { id } = await params;
  const { accion } = await req.json().catch(() => ({}));
  if (accion !== "confirmar" && accion !== "cancelar") return json({ error: "Acción inválida" }, 400);

  // RLS + filtro explícito: solo el dueño puede sincronizar su recarga
  const { data: rec } = await supabase.from("recargas").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!rec) return json({ error: "Recarga no encontrada" }, 404);

  try {
    const antes = rec.estado;
    const r = await sincronizarRecarga(rec as Recarga, { cancelar: accion === "cancelar" });
    if (r.estado !== antes && r.estado !== "aprobado") // los abonos ya se registran en la transacción
      await registrarActividad({
        userId: user.id, accion: `recarga_${r.estado}`,
        descripcion: `Recarga de ${Number(r.monto).toFixed(2)} ${r.moneda}: ${r.estado}`, entidad: "recarga", entidadId: id,
      });
    return json({ recarga: { id: r.id, monto: r.monto, moneda: r.moneda, estado: r.estado, detalle: r.detalle } });
  } catch {
    return json({ error: "No se pudo verificar el pago. Intenta de nuevo en unos minutos." }, 502);
  }
}
