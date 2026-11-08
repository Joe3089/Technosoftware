import { json } from "@/lib/api";
import { mensajeError } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/gestion/personal/:id?confirmar=<correo> — eliminación definitiva, solo admin,
// solo de desvinculados y solo si no tiene historial protegido (las FK "restrict" lo impiden).
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireStaff({ admin: true });
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!esUuid(id)) return json({ error: "Empleado inválido" }, 400);
  const { data: emp } = await auth.db.from("empleados").select("estado, email_corporativo").eq("id", id).maybeSingle();
  if (!emp) return json({ error: "Empleado no encontrado" }, 404);
  if (emp.estado !== "desvinculado") return json({ error: "Primero desvincula al empleado" }, 409);
  const confirmar = new URL(req.url).searchParams.get("confirmar") ?? "";
  if (confirmar.toLowerCase() !== emp.email_corporativo.toLowerCase())
    return json({ error: "Escribe el correo corporativo exacto para confirmar" }, 400);

  const { error } = await auth.db.from("empleados").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return json({ error: "Tiene historial (equipos, evaluaciones o colaboraciones) que debe conservarse; se mantiene como desvinculado" }, 409);
    const [m, s] = mensajeError(error); return json({ error: m }, s);
  }
  return json({ ok: true });
}
