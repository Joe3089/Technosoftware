import { requireRole, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";

const MAX_BYTES = 2 * 1024 * 1024;

/** Detecta el tipo real por la firma del archivo (no confía en el MIME declarado). */
function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}

// POST /api/perfil/avatar — multipart con el campo "foto"
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("foto");
  if (!(file instanceof File)) return json({ error: "No se recibió ninguna imagen" }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ error: "La imagen debe pesar menos de 2 MB" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const tipo = sniff(bytes);
  if (!tipo) return json({ error: "Formato no permitido. Usa JPG, PNG o WebP" }, 400);

  const admin = createAdminClient();
  const path = `${user.id}/avatar-${Date.now()}.${tipo.ext}`;
  const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, { contentType: tipo.mime });
  if (upErr) return json({ error: upErr.message }, 400);

  const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
  if (error) {
    await admin.storage.from("avatars").remove([path]);
    return json({ error: error.message }, 400);
  }
  if (prev?.avatar_url) await admin.storage.from("avatars").remove([prev.avatar_url]);

  await registrarActividad({
    userId: user.id, accion: "foto_perfil_actualizada", descripcion: "Actualizó su foto de perfil",
    entidad: "perfil", entidadId: user.id,
  });
  const { data: signed } = await admin.storage.from("avatars").createSignedUrl(path, 3600);
  return json({ avatarUrl: signed?.signedUrl ?? null });
}
