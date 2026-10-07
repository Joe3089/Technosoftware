import { json, isEmail, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/contacto — público: el formulario de la landing guarda al visitante como cliente "interesado"
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot anti-bots
  if (!str(body.nombre, 120) || !isEmail(body.email)) return json({ error: "Nombre y correo válido son obligatorios" }, 400);

  const supabase = createAdminClient();
  const email = body.email.toLowerCase();
  const { data: existing } = await supabase.from("clientes").select("id, notas").eq("email", email).maybeSingle();

  const mensaje = str(body.mensaje, 2000);
  const nota = mensaje ? `[${new Date().toLocaleDateString("es")}] ${mensaje}` : null;

  const { error } = existing
    ? await supabase.from("clientes").update({
        notas: [existing.notas, nota].filter(Boolean).join("\n"),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
    : await supabase.from("clientes").insert({
        nombre: str(body.nombre, 120),
        email,
        telefono: str(body.telefono, 40),
        empresa: str(body.empresa, 120),
        servicio: str(body.servicio, 120),
        notas: nota,
        tipo: "interesado",
      });

  if (error) return json({ error: "No se pudo registrar el contacto" }, 500);
  return json({ ok: true }, 201);
}
