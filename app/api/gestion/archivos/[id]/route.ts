import { json } from "@/lib/api";
import { mensajeError } from "@/lib/gestion/recursos";
import { requireStaff, esUuid } from "@/lib/gestion/servidor";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

// GET — URL firmada de 60 s si RLS permite ver el registro
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!esUuid(id)) return json({ error: "Archivo inválido" }, 400);
  const { data } = await auth.db.from("archivos_gestion").select("ruta, nombre").eq("id", id).maybeSingle();
  if (!data) return json({ error: "No encontrado" }, 404);
  const { data: firmado } = await createAdminClient().storage.from("gestion").createSignedUrl(data.ruta, 60, { download: data.nombre });
  if (!firmado) return json({ error: "No se pudo generar el enlace" }, 500);
  return json({ url: firmado.signedUrl });
}

// DELETE — quien lo subió o el admin (RLS); luego se elimina el objeto
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!esUuid(id)) return json({ error: "Archivo inválido" }, 400);
  const { data, error } = await auth.db.from("archivos_gestion").delete().eq("id", id).select("ruta");
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  if (!data?.length) return json({ error: "No encontrado o sin permiso" }, 404);
  await createAdminClient().storage.from("gestion").remove([data[0].ruta]);
  return json({ ok: true });
}
