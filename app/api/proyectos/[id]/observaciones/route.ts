import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { TIPOS_OBSERVACION } from "@/lib/proyectos";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proyectos/:id/observaciones { tipo, texto } — solo admin. Las observaciones no se editan.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const texto = str(body.texto, 2000);
  const tipo = body.tipo ?? "avance";
  if (!texto) return json({ error: "La observación no puede estar vacía" }, 400);
  if (!(tipo in TIPOS_OBSERVACION)) return json({ error: "Tipo de observación inválido" }, 400);

  const { supabase, user } = auth.session;
  const { data: proyecto } = await supabase.from("proyectos").select("user_id, nombre").eq("id", id).maybeSingle();
  if (!proyecto) return json({ error: "Proyecto no encontrado" }, 404);

  const { data, error } = await supabase.from("proyecto_observaciones")
    .insert({ proyecto_id: id, autor_id: user.id, tipo, texto }).select().single();
  if (error) return json({ error: error.message }, 400);
  await supabase.from("proyectos").update({ updated_at: new Date().toISOString() }).eq("id", id);

  await registrarActividad({
    userId: proyecto.user_id, actorId: user.id, accion: "observacion_registrada",
    descripcion: `${TIPOS_OBSERVACION[tipo]} en «${proyecto.nombre}»`, entidad: "proyecto", entidadId: id,
  });
  return json({ observacion: data }, 201);
}
