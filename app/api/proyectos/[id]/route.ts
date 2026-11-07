import { requireRole, json, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";
import { ESTADOS_PROYECTO, ESTADO_LABEL } from "@/lib/proyectos";
import { camposSeguimiento } from "../campos";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/proyectos/:id — detalle + observaciones (dueño o admin)
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  // RLS decides visibility of the project itself
  const { data: proyecto, error } = await auth.session.supabase.from("proyectos").select("*").eq("id", id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!proyecto) return json({ error: "Proyecto no encontrado" }, 404);

  // Author names come from profiles, which users can't read for other accounts
  const { data: obs, error: obsErr } = await createAdminClient().from("proyecto_observaciones")
    .select("id, tipo, texto, created_at, autor:profiles!proyecto_observaciones_autor_id_fkey(full_name, email)")
    .eq("proyecto_id", id).order("created_at", { ascending: false });
  if (obsErr) return json({ error: obsErr.message }, 500);
  return json({ proyecto, observaciones: obs });
}

// PATCH /api/proyectos/:id — solo admin
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const extra = camposSeguimiento(body);
  if ("error" in extra) return json({ error: extra.error }, 400);
  const update: Record<string, unknown> = { ...extra.campos, updated_at: new Date().toISOString() };
  if ("nombre" in body) {
    if (!str(body.nombre, 120)) return json({ error: "Nombre inválido" }, 400);
    update.nombre = str(body.nombre, 120);
  }
  if ("descripcion" in body) update.descripcion = str(body.descripcion, 2000);
  if ("estado" in body) {
    if (!ESTADOS_PROYECTO.includes(body.estado)) return json({ error: "Estado inválido" }, 400);
    update.estado = body.estado;
  }

  const { data, error } = await auth.session.supabase.from("proyectos").update(update).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 400);

  const cambios = Object.keys(update).filter((k) => k !== "updated_at");
  await registrarActividad({
    userId: data.user_id, actorId: auth.session.user.id, accion: "proyecto_actualizado",
    descripcion: "estado" in body
      ? `Proyecto «${data.nombre}» pasó a ${ESTADO_LABEL[data.estado]}`
      : `Proyecto «${data.nombre}» actualizado (${cambios.join(", ")})`,
    entidad: "proyecto", entidadId: id,
  });
  return json({ proyecto: data });
}

// DELETE /api/proyectos/:id — solo admin; la BD lo impide si el proyecto tiene movimientos
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.session.supabase.from("proyectos").delete().eq("id", id).select().single();
  if (error) return json({ error: error.code === "23503" ? "El proyecto tiene movimientos; no se puede eliminar" : error.message }, 400);

  await registrarActividad({
    userId: data.user_id, actorId: auth.session.user.id, accion: "proyecto_eliminado",
    descripcion: `Proyecto «${data.nombre}» eliminado`, entidad: "proyecto", entidadId: id,
  });
  return json({ ok: true });
}
