import { json } from "@/lib/api";
import { requireStaff } from "@/lib/permissions";

// GET /api/gestion/contexto — rol, permisos efectivos, ficha propia y notificaciones sin leer
export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { ctx, db, session } = auth;
  const [emp, noLeidas] = await Promise.all([
    ctx.empleado_id
      ? db.from("empleados").select("id, nombre, apellido, departamento_id, cargo:cargos!empleados_cargo_id_fkey(nombre)").eq("id", ctx.empleado_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("notificaciones").select("id", { count: "exact", head: true }).is("leida_at", null),
  ]);
  return json({
    ...ctx,
    email: session.user.email,
    nombre: session.fullName ?? session.user.email,
    empleado: emp.data,
    notificaciones: noLeidas.count ?? 0,
  });
}
