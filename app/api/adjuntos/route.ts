import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { MAX_ARCHIVO, sniff, nombreSeguro } from "@/lib/archivos";

const MAX_POR_SOLICITUD = 5;

// POST /api/adjuntos — multipart { tipo: consultoria|solicitud, ref: uuid, archivo }
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;

  const form = await req.formData().catch(() => null);
  const tipo = form?.get("tipo"), ref = form?.get("ref"), file = form?.get("archivo");
  if ((tipo !== "consultoria" && tipo !== "solicitud") || typeof ref !== "string" || !(file instanceof File))
    return json({ error: "Datos del adjunto inválidos" }, 400);
  if (file.size === 0 || file.size > MAX_ARCHIVO) return json({ error: "Cada archivo debe pesar menos de 4 MB" }, 400);

  // The parent request must belong to the user (not just be visible: admins can see all)
  const tabla = tipo === "consultoria" ? "consultorias" : "solicitudes_proyecto";
  const fk = tipo === "consultoria" ? "consultoria_id" : "solicitud_id";
  const { data: padre } = await supabase.from(tabla).select("id").eq("id", ref).eq("user_id", user.id).maybeSingle();
  if (!padre) return json({ error: "Solicitud no encontrada" }, 404);

  const admin = createAdminClient();
  const { count } = await admin.from("adjuntos").select("id", { count: "exact", head: true }).eq(fk, ref);
  if ((count ?? 0) >= MAX_POR_SOLICITUD) return json({ error: `Máximo ${MAX_POR_SOLICITUD} archivos por solicitud` }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const t = sniff(bytes, file.name);
  if (!t) return json({ error: "Tipo no permitido. Usa PDF, imágenes (JPG, PNG, WebP), Word (.docx) o Excel (.xlsx)" }, 400);

  const nombre = nombreSeguro(file.name, t.ext);
  const path = `${user.id}/${tipo}/${ref}/${crypto.randomUUID()}.${t.ext}`;
  const up = await admin.storage.from("adjuntos").upload(path, bytes, { contentType: t.mime });
  if (up.error) return json({ error: "No se pudo guardar el archivo" }, 500);

  const { data, error } = await admin.from("adjuntos")
    .insert({ user_id: user.id, [fk]: ref, path, nombre, mime: t.mime, tamano: file.size }).select("id, nombre").single();
  if (error) {
    await admin.storage.from("adjuntos").remove([path]);
    return json({ error: "No se pudo registrar el archivo" }, 500);
  }
  return json({ adjunto: data }, 201);
}
