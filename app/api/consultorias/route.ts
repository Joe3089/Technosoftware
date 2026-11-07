import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { ESTADOS_ACTIVOS } from "@/lib/proyectos";
import { PRIORIDADES, campo, validarReunion } from "@/lib/solicitudes";
import { guardarConReunion, listarPropias } from "@/lib/solicitudes-server";

/** A prospect gets one free consultation; the rest require a contracted project. */
async function gratuitaDisponible(userId: string) {
  const { count } = await createAdminClient().from("consultorias")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("gratuita", true);
  return !count;
}

// GET /api/consultorias — consultorías del usuario (con estado de la reunión); ?cupo=1 → { gratuitaDisponible }
export async function GET(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  if (new URL(req.url).searchParams.has("cupo")) return json({ gratuitaDisponible: await gratuitaDisponible(auth.session.user.id) });
  return listarPropias(auth.session, "consultorias", "id, codigo, objetivo, prioridad, estado, created_at, proyecto:proyectos(nombre)");
}

// POST /api/consultorias — { proyecto_id | "gratuita", objetivo, descripcion, ..., reunion? }
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return json({ error: "Solicitud inválida" }, 400);

  if (typeof b.proyecto_id !== "string" || !b.proyecto_id) return json({ error: "Selecciona un proyecto", errores: { proyecto_id: "Obligatorio" } }, 400);
  const gratuita = b.proyecto_id === "gratuita";
  let proyecto: { id: string; nombre: string } | null = null;
  if (gratuita) {
    if (!(await gratuitaDisponible(user.id)))
      return json({ error: "Ya usaste tu consultoría gratuita. Las siguientes consultorías están disponibles al contratar un proyecto.", errores: { proyecto_id: "Sin consultoría gratuita" } }, 403);
  } else {
    // The project must be the user's own and in development (RLS + explicit owner check)
    const { data } = await supabase.from("proyectos").select("id, nombre, estado, user_id")
      .eq("id", b.proyecto_id).eq("user_id", user.id).maybeSingle();
    if (!data || !ESTADOS_ACTIVOS.includes(data.estado))
      return json({ error: "El proyecto no existe o no está en desarrollo", errores: { proyecto_id: "Proyecto no válido" } }, 400);
    proyecto = data;
  }

  const faltan: string[] = [];
  const fila = {
    user_id: user.id,
    proyecto_id: proyecto?.id ?? null,
    gratuita,
    objetivo: campo(b, "objetivo", 200, true, faltan),
    descripcion: campo(b, "descripcion", 4000, true, faltan),
    situacion_actual: campo(b, "situacion_actual", 2000),
    problema: campo(b, "problema", 2000),
    resultado_esperado: campo(b, "resultado_esperado", 2000),
    prioridad: PRIORIDADES.includes(b.prioridad) ? b.prioridad : "media",
    observaciones: campo(b, "observaciones", 2000),
  };
  const errores: Record<string, string> = Object.fromEntries(faltan.map((k) => [k, "Obligatorio"]));

  let reunion = null;
  if (b.reunion) {
    const r = validarReunion(b.reunion);
    if ("errores" in r) Object.assign(errores, Object.fromEntries(Object.entries(r.errores).map(([k, v]) => [`reunion.${k}`, v])));
    else reunion = r.data;
  }
  if (Object.keys(errores).length) return json({ error: "Revisa los campos marcados", errores }, 400);

  return guardarConReunion({
    userId: user.id, tabla: "consultorias", fk: "consultoria_id", fila, reunion,
    descripcion: (codigo) => gratuita ? `Envió su consultoría gratuita ${codigo}` : `Envió la consultoría ${codigo} sobre «${proyecto!.nombre}»`,
    accion: "consultoria_enviada",
  });
}
