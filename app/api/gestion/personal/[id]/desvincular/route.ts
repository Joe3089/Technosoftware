import { z } from "zod";
import { json } from "@/lib/api";
import { mensajeError } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const Cuerpo = z.object({
  motivo: z.string().trim().min(3, "Indica el motivo").max(500),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reasignar_a: z.uuid().nullable().optional(),
});

// POST /api/gestion/personal/:id/desvincular — Talento Humano o admin.
// La función SQL valida el permiso, reasigna actividades abiertas, cierra sesiones y conserva el historial;
// después se bloquea el inicio de sesión de la cuenta.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireStaff({ permiso: "empleados.gestionar" });
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!esUuid(id)) return json({ error: "Empleado inválido" }, 400);
  const parsed = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, 400);

  const { data, error } = await auth.db.rpc("desvincular_empleado", {
    emp: id, motivo: parsed.data.motivo, fecha: parsed.data.fecha ?? new Date().toISOString().slice(0, 10),
    reasignar_a: parsed.data.reasignar_a ?? null,
  });
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }

  const profileId = (data as { profile_id: string | null }).profile_id;
  if (profileId) {
    const { error: e } = await createAdminClient().auth.admin.updateUserById(profileId, { ban_duration: "876000h" });
    if (e) return json({ ok: true, aviso: "Desvinculado, pero no se pudo bloquear el inicio de sesión. Reintenta." }, 207);
  }
  return json({ ok: true, ...(data as object) });
}
