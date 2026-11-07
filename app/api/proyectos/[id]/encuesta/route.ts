import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { proyectoVisible } from "@/lib/contratacion-server";
import { PREGUNTAS_ENCUESTA } from "@/lib/contratacion";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proyectos/:id/encuesta — cliente, una sola vez, después de la reunión final
//   { general, calidad, comunicacion, plazos, soporte (1–5), recomendaria, comentario?, resena?: { texto, empresa? } }
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin } = v;
  if (proyecto.user_id !== auth.session.user.id) return json({ error: "Solo el cliente puede responder la encuesta" }, 403);
  if (!proyecto.reunion_final_at) return json({ error: "La encuesta se habilita después de la reunión final" }, 409);

  const b = await req.json().catch(() => ({}));
  const fila: Record<string, unknown> = { proyecto_id: proyecto.id, user_id: auth.session.user.id };
  for (const { id } of PREGUNTAS_ENCUESTA) {
    const n = Number(b[id]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return json({ error: "Responde todas las preguntas (1 a 5 estrellas)" }, 400);
    fila[id] = n;
  }
  if (typeof b.recomendaria !== "boolean") return json({ error: "Indica si nos recomendarías" }, 400);
  fila.recomendaria = b.recomendaria;
  fila.comentario = str(b.comentario, 2000);

  const resenaTexto = b.resena ? str(b.resena.texto, 1000) : null;
  if (b.resena && (!resenaTexto || resenaTexto.length < 10)) return json({ error: "La reseña debe tener al menos 10 caracteres" }, 400);

  const { error } = await admin.from("encuestas").insert(fila);
  if (error) return json({ error: error.code === "23505" ? "Ya respondiste la encuesta de este proyecto" : error.message }, error.code === "23505" ? 409 : 500);

  // Optional public review, published only after admin moderation
  if (resenaTexto) {
    await admin.from("resenas").insert({
      user_id: auth.session.user.id, proyecto_id: proyecto.id, calificacion: fila.general,
      nombre: auth.session.fullName || "Cliente de Technosoftware", empresa: str(b.resena.empresa, 120), texto: resenaTexto,
    });
  }
  await registrarActividad({
    userId: auth.session.user.id, accion: "encuesta_respondida", entidad: "proyecto", entidadId: proyecto.id,
    descripcion: `Respondió la encuesta de servicio de «${proyecto.nombre}»`,
  });
  return json({ ok: true }, 201);
}
