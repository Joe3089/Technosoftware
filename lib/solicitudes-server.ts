import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";
import type { ReunionValida } from "@/lib/solicitudes";
import type { getSessionProfile } from "@/lib/supabase/server";

type Session = NonNullable<Awaited<ReturnType<typeof getSessionProfile>>>;
export type TablaSolicitud = "consultorias" | "solicitudes_proyecto";

/**
 * Inserts a request and (optionally) its linked meeting. If the meeting can't be
 * stored, the request is rolled back so the user never sees a false confirmation.
 */
export async function guardarConReunion(o: {
  userId: string; tabla: TablaSolicitud; fk: "consultoria_id" | "solicitud_id";
  fila: Record<string, unknown>; reunion: ReunionValida | null;
  accion: string; descripcion: (codigo: string) => string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.from(o.tabla).insert(o.fila).select("id, codigo, estado").single();
  if (error) return json({ error: "No se pudo guardar la solicitud. Intenta de nuevo." }, 500);

  let reunion: { id: string; estado: string } | null = null;
  if (o.reunion) {
    const r = await admin.from("reuniones").insert({ ...o.reunion, user_id: o.userId, [o.fk]: data.id }).select("id, estado").single();
    if (r.error) {
      await admin.from(o.tabla).delete().eq("id", data.id);
      return json({ error: "No se pudo registrar la reunión; la solicitud no se guardó. Intenta de nuevo." }, 500);
    }
    reunion = r.data;
  }

  await registrarActividad({
    userId: o.userId, accion: o.accion, entidad: o.tabla, entidadId: data.id,
    descripcion: o.descripcion(data.codigo) + (reunion ? " con solicitud de reunión" : ""),
  });
  return json({ id: data.id, codigo: data.codigo, estado: data.estado, reunion }, 201);
}

/** Latest requests of the signed-in user (RLS-scoped), with the linked meeting. */
export async function listarPropias(s: Session, tabla: TablaSolicitud, cols: string) {
  const { data, error } = await s.supabase.from(tabla)
    .select(`${cols}, reunion:reuniones(estado, fecha_hora, zona_horaria, modalidad)`)
    .eq("user_id", s.user.id).order("created_at", { ascending: false }).limit(10);
  if (error) return json({ error: error.message }, 500);
  return json({ items: data });
}
