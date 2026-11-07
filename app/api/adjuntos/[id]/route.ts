import { NextResponse } from "next/server";
import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/adjuntos/:id — redirige a una URL firmada de 5 min (dueño o admin, por RLS)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { data } = await auth.session.supabase.from("adjuntos").select("path, nombre").eq("id", id).maybeSingle();
  if (!data) return json({ error: "Archivo no encontrado" }, 404);
  const { data: signed } = await createAdminClient().storage.from("adjuntos")
    .createSignedUrl(data.path, 300, { download: data.nombre });
  if (!signed) return json({ error: "No se pudo generar el enlace" }, 500);
  return NextResponse.redirect(signed.signedUrl);
}
