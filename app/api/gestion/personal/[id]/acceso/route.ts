import { randomBytes } from "node:crypto";
import { z } from "zod";
import { json } from "@/lib/api";
import { mensajeError } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const Cuerpo = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("crear") }),                 // cuenta nueva con el correo corporativo
  z.object({ accion: z.literal("vincular"), email: z.email() }), // cuenta ya registrada
  z.object({ accion: z.literal("reincorporar") }),          // revierte una desvinculación
]);

// POST /api/gestion/personal/:id/acceso — dan acceso el Administrador General y el coordinador de Talento
// (empleados.asignar_rol); reincorporar y vincular la cuenta del admin es exclusivo del admin.
// El registro público nunca crea personal: la cuenta queda como "user" y solo la fila de empleados da acceso a /dashboard.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireStaff({ permiso: "empleados.asignar_rol" });
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!esUuid(id)) return json({ error: "Empleado inválido" }, 400);
  const parsed = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Datos inválidos" }, 400);

  const { data: emp } = await auth.db.from("empleados").select("id, profile_id, email_corporativo, nombre, apellido, estado").eq("id", id).maybeSingle();
  if (!emp) return json({ error: "Empleado no encontrado" }, 404);
  const admin = createAdminClient();
  const b = parsed.data;

  if (b.accion === "reincorporar") {
    if (auth.ctx.rol !== "admin") return json({ error: "Solo el Administrador General reincorpora empleados" }, 403);
    if (emp.estado !== "desvinculado") return json({ error: "El empleado no está desvinculado" }, 400);
    const { error } = await auth.db.from("empleados")
      .update({ estado: "activo", fecha_desvinculacion: null, motivo_desvinculacion: null }).eq("id", id);
    if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
    if (emp.profile_id) await admin.auth.admin.updateUserById(emp.profile_id, { ban_duration: "none" });
    return json({ ok: true });
  }

  if (emp.profile_id) return json({ error: "El empleado ya tiene una cuenta vinculada" }, 409);
  if (emp.estado !== "activo") return json({ error: "Solo se da acceso a empleados activos" }, 400);

  let profileId: string;
  let claveTemporal: string | null = null;
  if (b.accion === "vincular") {
    const { data: prof } = await admin.from("profiles").select("id, role").ilike("email", b.email.replace(/[%_\\]/g, "\\$&")).maybeSingle();
    if (!prof) return json({ error: "No existe una cuenta registrada con ese correo" }, 404);
    // El admin puede tener expediente (rol Administrador General) para recibir actividades; solo él lo vincula
    if (prof.role === "admin" && auth.ctx.rol !== "admin") return json({ error: "Solo el administrador vincula su propia cuenta" }, 403);
    profileId = prof.id;
  } else {
    claveTemporal = randomBytes(12).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email: emp.email_corporativo, password: claveTemporal, email_confirm: true,
      user_metadata: { full_name: `${emp.nombre} ${emp.apellido}`.trim() },
    });
    if (error || !data.user) return json({ error: /already/i.test(error?.message ?? "") ? "Ese correo ya tiene cuenta: usa «Vincular cuenta existente»" : "No se pudo crear la cuenta" }, 409);
    profileId = data.user.id;
  }

  // Se enlaza con la sesión del admin para que la auditoría registre al autor
  const { error } = await auth.db.from("empleados").update({ profile_id: profileId }).eq("id", id);
  if (error) {
    if (claveTemporal) await admin.auth.admin.deleteUser(profileId); // no dejar cuentas huérfanas
    const [m, s] = mensajeError(error); return json({ error: m }, s);
  }
  return json({ ok: true, claveTemporal });
}
