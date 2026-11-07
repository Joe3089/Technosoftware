import { json } from "@/lib/api";
import { createAdminClient, type getSessionProfile } from "@/lib/supabase/server";

type Session = NonNullable<Awaited<ReturnType<typeof getSessionProfile>>>;

/** Loads a project the session may see (owner or admin), or an error response. */
export async function proyectoVisible(s: Session, id: string) {
  const { data } = await s.supabase.from("proyectos").select("id, user_id, nombre, estado, reunion_final_at").eq("id", id).maybeSingle();
  if (!data) return { error: json({ error: "Proyecto no encontrado" }, 404) } as const;
  const esAdmin = s.role === "admin";
  if (!esAdmin && data.user_id !== s.user.id) return { error: json({ error: "Proyecto no encontrado" }, 404) } as const;
  return { proyecto: data, esAdmin, admin: createAdminClient() } as const;
}
