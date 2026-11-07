import { requireRole, json } from "@/lib/api";
import { proyectoVisible } from "@/lib/contratacion-server";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/proyectos/:id/contratacion — presupuesto, contrato, reunión final y encuesta (dueño o admin)
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin } = v;

  const [pre, con, enc] = await Promise.all([
    admin.from("presupuestos").select("id, items, total, moneda, notas, valido_hasta, estado, motivo_rechazo, respondido_at, updated_at").eq("proyecto_id", proyecto.id).maybeSingle(),
    admin.from("contratos").select("id, estado, observacion, firmado_path, aprobado_at, descargado_at, firmado_at, verificado_at, updated_at").eq("proyecto_id", proyecto.id).maybeSingle(),
    admin.from("encuestas").select("general, calidad, comunicacion, plazos, soporte, recomendaria, comentario, created_at").eq("proyecto_id", proyecto.id).maybeSingle(),
  ]);
  const err = pre.error ?? con.error ?? enc.error;
  if (err) return json({ error: err.message }, 500);

  // Storage paths never leave the server
  let contrato = null;
  if (con.data) {
    const { firmado_path, ...resto } = con.data;
    contrato = { ...resto, tieneFirmado: !!firmado_path };
  }
  return json({
    proyecto: { id: proyecto.id, nombre: proyecto.nombre, estado: proyecto.estado, reunion_final_at: proyecto.reunion_final_at },
    presupuesto: pre.data ? { ...pre.data, total: Number(pre.data.total) } : null,
    contrato,
    encuesta: enc.data,
  });
}
