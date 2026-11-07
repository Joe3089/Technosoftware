import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

const PUBLICAS = "id, nombre, empresa, calificacion, texto, created_at";

// GET /api/resenas — público: reseñas publicadas. ?todas=1 (admin): todas, para moderarlas
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.has("todas")) {
    const auth = await requireRole("admin");
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.session.supabase.from("resenas")
      .select(`${PUBLICAS}, estado, proyecto:proyectos(nombre)`).order("created_at", { ascending: false }).limit(100);
    if (error) return json({ error: error.message }, 500);
    return json({ resenas: data });
  }
  const { data, error } = await createAdminClient().from("resenas").select(PUBLICAS)
    .eq("estado", "publicada").order("created_at", { ascending: false }).limit(24);
  if (error) return json({ error: "No se pudieron cargar las reseñas" }, 500);
  return json({ resenas: data });
}
