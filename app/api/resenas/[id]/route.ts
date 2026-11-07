import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/resenas/:id { estado: "publicada" | "oculta" } — solo admin
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { estado } = await req.json().catch(() => ({}));
  if (estado !== "publicada" && estado !== "oculta") return json({ error: "Estado inválido" }, 400);
  // Writes go through the service role (RLS only exposes reads)
  const { error } = await createAdminClient().from("resenas")
    .update({ estado, updated_at: new Date().toISOString() }).eq("id", (await params).id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
