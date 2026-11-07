import { requireRole, json, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";

const CAMPOS = [
  "nombre", "apellido", "cedula", "dirHab", "dirEmp", "telHab", "telEmp",
  "telMov", "empresa", "cargo", "profesion", "correo",
] as const;

// GET /api/perfil — datos personales y URL firmada de la foto
export async function GET() {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;
  const { data, error } = await supabase.from("profiles").select("datos, avatar_url").eq("id", user.id).single();
  if (error) return json({ error: error.message }, 500);

  let avatarUrl: string | null = null;
  if (data.avatar_url) {
    const { data: signed } = await createAdminClient().storage.from("avatars").createSignedUrl(data.avatar_url, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }
  return json({ datos: data.datos ?? {}, avatarUrl });
}

// PUT /api/perfil — guarda los datos personales (solo campos conocidos)
export async function PUT(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;
  const body = await req.json().catch(() => ({}));

  const { data: prev } = await supabase.from("profiles").select("datos").eq("id", user.id).single();
  const anterior = (prev?.datos ?? {}) as Record<string, string>;
  const datos: Record<string, string> = {};
  for (const k of CAMPOS) datos[k] = str(body?.[k], 200) ?? "";

  const cambiados = CAMPOS.filter((k) => (anterior[k] ?? "") !== datos[k]);
  if (!cambiados.length) return json({ datos });

  const full_name = [datos.nombre, datos.apellido].filter(Boolean).join(" ") || null;
  const { error } = await supabase.from("profiles")
    .update({ datos, ...(full_name ? { full_name } : {}) }).eq("id", user.id);
  if (error) return json({ error: error.message }, 400);

  // Solo se registra cuántos campos cambiaron, nunca sus valores
  await registrarActividad({
    userId: user.id, accion: "datos_personales_actualizados",
    descripcion: `Actualizó sus datos personales (${cambiados.length} campo${cambiados.length > 1 ? "s" : ""})`,
    entidad: "perfil", entidadId: user.id,
  });
  return json({ datos });
}
