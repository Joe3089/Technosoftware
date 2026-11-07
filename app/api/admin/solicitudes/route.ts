import { requireRole, json } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";

const REUNION = "reunion:reuniones(id, estado, fecha_hora, zona_horaria, modalidad, motivo, telefono, canales, email_personal, email_corporativo, empresa, direccion, lat, lng, ubicacion_fuente, observaciones)";
const COMUN = `cliente:profiles!%s_user_id_fkey(email, full_name), adjuntos(id, nombre, tamano), ${REUNION}`;

const ESTADOS: Record<string, string[]> = {
  consultorias: ["recibida", "en_revision", "respondida", "cerrada"],
  solicitudes_proyecto: ["pendiente_revision", "en_revision", "aprobada", "rechazada"],
  reuniones: ["pendiente_confirmacion", "confirmada", "reprogramar", "cancelada"],
};

// GET /api/admin/solicitudes — consultorías y solicitudes de proyecto para seguimiento (solo admin)
export async function GET() {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const s = auth.session.supabase;
  const [con, sol] = await Promise.all([
    s.from("consultorias").select(`*, proyecto:proyectos(nombre), ${COMUN.replace("%s", "consultorias")}`)
      .order("created_at", { ascending: false }).limit(50),
    s.from("solicitudes_proyecto").select(`*, ${COMUN.replace("%s", "solicitudes_proyecto")}`)
      .order("created_at", { ascending: false }).limit(50),
  ]);
  if (con.error || sol.error) return json({ error: (con.error ?? sol.error)!.message }, 500);
  return json({ consultorias: con.data, solicitudes: sol.data });
}

// PATCH /api/admin/solicitudes { tabla, id, estado } — solo admin
export async function PATCH(req: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { tabla, id, estado } = await req.json().catch(() => ({}));
  if (!(tabla in ESTADOS) || typeof id !== "string" || !ESTADOS[tabla].includes(estado))
    return json({ error: "Datos inválidos" }, 400);

  const { data, error } = await auth.session.supabase.from(tabla)
    .update({ estado, updated_at: new Date().toISOString() }).eq("id", id).select("user_id").single();
  if (error) return json({ error: error.message }, 400);

  const etiqueta = tabla === "reuniones" ? "Tu solicitud de reunión" : tabla === "consultorias" ? "Tu consultoría" : "Tu solicitud de proyecto";
  await registrarActividad({
    userId: data.user_id, actorId: auth.session.user.id, accion: `${tabla}_estado`,
    descripcion: `${etiqueta} pasó a «${estado.replace(/_/g, " ")}»`, entidad: tabla, entidadId: id,
  });
  return json({ ok: true });
}
