import { json } from "@/lib/api";
import { requireAcceso } from "@/lib/permissions";
import { conciliarRecarga } from "@/lib/conciliacion";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/recargas/:id/conciliar — (re)concilia una recarga ya aprobada (solo admin)
export async function POST(_req: Request, { params }: Ctx) {
  const auth = await requireAcceso("pagos.verificar");
  if ("error" in auth) return auth.error;
  const c = await conciliarRecarga((await params).id).catch((e) => { console.error("[conciliar]", e?.message); return null; });
  return c ? json({ conciliacion: c }) : json({ error: "Solo se concilian pagos aprobados" }, 400);
}
