import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { proyectoVisible } from "@/lib/contratacion-server";
import { totalItems, validarItems } from "@/lib/contratacion";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/proyectos/:id/presupuesto — admin: crea o reemplaza { items, notas?, valido_hasta? }
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin } = v;
  const b = await req.json().catch(() => ({}));

  const items = validarItems(b.items);
  if (!items) return json({ error: "Agrega al menos un concepto con cantidad y precio válidos" }, 400);
  const valido = typeof b.valido_hasta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.valido_hasta) ? b.valido_hasta : null;

  // An approved budget is the basis of the contract: it can't be silently replaced
  const { data: actual } = await admin.from("presupuestos").select("estado").eq("proyecto_id", proyecto.id).maybeSingle();
  if (actual?.estado === "aprobado") return json({ error: "El presupuesto ya fue aprobado por el cliente" }, 409);

  const fila = {
    proyecto_id: proyecto.id, items, total: totalItems(items), notas: str(b.notas, 2000), valido_hasta: valido,
    estado: "enviado", motivo_rechazo: null, respondido_at: null, updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("presupuestos").upsert(fila, { onConflict: "proyecto_id" });
  if (error) return json({ error: error.message }, 500);

  await registrarActividad({
    userId: proyecto.user_id, actorId: auth.session.user.id, accion: "presupuesto_enviado", entidad: "proyecto", entidadId: proyecto.id,
    descripcion: `Recibió el presupuesto de «${proyecto.nombre}» por ${fila.total.toFixed(2)} USD`,
  });
  return json({ ok: true });
}

// POST /api/proyectos/:id/presupuesto — cliente: { accion: "aprobar" | "rechazar", motivo? }
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin } = v;
  if (proyecto.user_id !== auth.session.user.id) return json({ error: "Solo el cliente puede responder el presupuesto" }, 403);

  const { accion, motivo } = await req.json().catch(() => ({}));
  if (accion !== "aprobar" && accion !== "rechazar") return json({ error: "Acción inválida" }, 400);
  if (accion === "rechazar" && !str(motivo, 1000)) return json({ error: "Indica el motivo del rechazo" }, 400);

  const ahora = new Date().toISOString();
  const { data, error } = await admin.from("presupuestos")
    .update({ estado: accion === "aprobar" ? "aprobado" : "rechazado", motivo_rechazo: accion === "rechazar" ? str(motivo, 1000) : null,
      respondido_at: ahora, updated_at: ahora })
    .eq("proyecto_id", proyecto.id).eq("estado", "enviado").select("total").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "No hay un presupuesto pendiente de respuesta" }, 409);

  await registrarActividad({
    userId: proyecto.user_id, accion: accion === "aprobar" ? "presupuesto_aprobado" : "presupuesto_rechazado", entidad: "proyecto", entidadId: proyecto.id,
    descripcion: `${accion === "aprobar" ? "Aprobó" : "Rechazó"} el presupuesto de «${proyecto.nombre}»`,
  });
  return json({ ok: true });
}
