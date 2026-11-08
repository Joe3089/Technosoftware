import { json } from "@/lib/api";
import { mensajeError, resolver } from "@/lib/gestion/recursos";
import { requireStaff } from "@/lib/gestion/servidor";

type Ctx = { params: Promise<{ recurso: string; id: string }> };

async function preparar(params: Ctx["params"], opts: { escribir?: boolean } = {}) {
  const { recurso, id } = await params;
  const r = resolver(recurso);
  if (!r || Array.isArray(r.pk)) return { error: json({ error: "Recurso no encontrado" }, 404) } as const;
  const auth = await requireStaff(opts.escribir ? { admin: r.soloAdmin } : { permiso: r.permiso });
  if ("error" in auth) return { error: auth.error } as const;
  return { r, auth, pk: (r.pk as string | undefined) ?? "id", id: decodeURIComponent(id).slice(0, 120) } as const;
}

export async function GET(_req: Request, { params }: Ctx) {
  const p = await preparar(params);
  if ("error" in p) return p.error;
  const { data, error } = await p.auth.db.from(p.r.tabla).select(p.r.select).eq(p.pk, p.id).maybeSingle();
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  if (!data) return json({ error: "No encontrado" }, 404);
  return json({ dato: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const p = await preparar(params, { escribir: true });
  if ("error" in p) return p.error;
  if (!p.r.editar) return json({ error: "Operación no permitida" }, 405);
  const parsed = p.r.editar.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, 400);
  const cambios = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  if (!Object.keys(cambios).length) return json({ error: "Sin cambios" }, 400);

  const { data, error } = await p.auth.db.from(p.r.tabla).update(cambios).eq(p.pk, p.id).select(p.r.select).single();
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  return json({ dato: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const p = await preparar(params, { escribir: true });
  if ("error" in p) return p.error;
  if (!p.r.borrar) return json({ error: "Este registro no se elimina; cambia su estado" }, 405);
  const q = p.r.borrar === "soft"
    ? p.auth.db.from(p.r.tabla).update({ deleted_at: new Date().toISOString() }).eq(p.pk, p.id)
    : p.auth.db.from(p.r.tabla).delete().eq(p.pk, p.id);
  const { data, error } = await q.select(p.pk);
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  if (!data?.length) return json({ error: "No encontrado o sin permiso" }, 404);
  return json({ ok: true });
}
