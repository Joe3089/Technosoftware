import { requireRole, json } from "@/lib/api";
import { listarMetodos } from "@/lib/metodos-server";

// GET /api/metodos-pago — usuarios: solo los disponibles; admin: todos (para configurarlos)
export async function GET() {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  try {
    const metodos = await listarMetodos(auth.session.supabase);
    return json({ metodos: auth.session.role === "admin" ? metodos : metodos.filter((m) => m.disponible) });
  } catch {
    return json({ error: "No se pudieron cargar los métodos de pago" }, 500);
  }
}
