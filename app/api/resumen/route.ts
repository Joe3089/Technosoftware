import { requireRole, json } from "@/lib/api";
import { ESTADOS_ACTIVOS } from "@/lib/proyectos";

// GET /api/resumen — datos del inicio del panel. RLS decide el alcance: el usuario ve lo suyo, el admin todo.
export async function GET() {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const s = auth.session.supabase;
  const ahora = new Date().toISOString();

  const [activos, completados, consultorias, encuestas, recientes, reunion] = await Promise.all([
    s.from("proyectos").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACTIVOS),
    s.from("proyectos").select("id", { count: "exact", head: true }).eq("estado", "completado"),
    s.from("consultorias").select("id", { count: "exact", head: true }).in("estado", ["recibida", "en_revision"]),
    s.from("encuestas").select("general"),
    s.from("proyectos").select("id, nombre, estado, avance").neq("estado", "cancelado").order("updated_at", { ascending: false }).limit(4),
    s.from("reuniones").select("fecha_hora, zona_horaria, modalidad, estado")
      .in("estado", ["pendiente_confirmacion", "confirmada"]).gte("fecha_hora", ahora).order("fecha_hora").limit(1).maybeSingle(),
  ]);
  const err = activos.error ?? completados.error ?? consultorias.error ?? encuestas.error ?? recientes.error ?? reunion.error;
  if (err) return json({ error: err.message }, 500);

  const notas = (encuestas.data ?? []).map((e) => e.general as number);
  return json({
    activos: activos.count ?? 0,
    completados: completados.count ?? 0,
    consultoriasAbiertas: consultorias.count ?? 0,
    valoracion: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null,
    recientes: recientes.data ?? [],
    proximaReunion: reunion.data,
  });
}
