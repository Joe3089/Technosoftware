import { requireRole, json, isEmail, str } from "@/lib/api";

const TIPOS = ["interesado", "fijo"];

// GET /api/clientes?tipo=interesado|fijo&q=texto — cualquier usuario autenticado
export async function GET(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const q = searchParams.get("q")?.replace(/[%,()]/g, "");

  let query = auth.session.supabase.from("clientes").select("*").order("created_at", { ascending: false });
  if (tipo && TIPOS.includes(tipo)) query = query.eq("tipo", tipo);
  if (q) query = query.or(`nombre.ilike.%${q}%,email.ilike.%${q}%,empresa.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ clientes: data });
}

// POST /api/clientes — solo admin
export async function POST(req: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  if (!str(body.nombre, 120) || !isEmail(body.email)) return json({ error: "Nombre y correo válido son obligatorios" }, 400);

  const { data, error } = await auth.session.supabase
    .from("clientes")
    .insert({
      nombre: str(body.nombre, 120),
      email: body.email.toLowerCase(),
      telefono: str(body.telefono, 40),
      empresa: str(body.empresa, 120),
      servicio: str(body.servicio, 120),
      notas: str(body.notas, 2000),
      tipo: TIPOS.includes(body.tipo) ? body.tipo : "interesado",
    })
    .select()
    .single();
  if (error) return json({ error: error.code === "23505" ? "Ese correo ya está registrado" : error.message }, 400);
  return json({ cliente: data }, 201);
}
