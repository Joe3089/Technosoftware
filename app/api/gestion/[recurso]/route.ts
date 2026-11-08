import { json } from "@/lib/api";
import { mensajeError, resolver } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";

type Ctx = { params: Promise<{ recurso: string }> };

const limpiar = (q: string) => q.replace(/[,()*%\\:"'.]/g, " ").trim().slice(0, 80);
const COLUMNA = /^[a-z_]+$/;

// GET /api/gestion/:recurso?q=&page=&size=&orden=&dir=&f.<col>=v|v1,v2|null&r.<col>=desde..hasta
export async function GET(req: Request, { params }: Ctx) {
  const r = resolver((await params).recurso);
  if (!r) return json({ error: "Recurso no encontrado" }, 404);
  const auth = await requireStaff({ permiso: r.permiso });
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const size = Math.min(Math.max(Number(sp.get("size")) || 25, 1), 200);
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  const ordenCol = sp.get("orden");
  const [col, asc] = ordenCol && (r.ordenables ?? []).includes(ordenCol) ? [ordenCol, sp.get("dir") !== "desc"] : r.orden;

  let query = auth.db.from(r.tabla).select(r.select, { count: "exact" });
  if (r.borrar === "soft" && !(sp.get("papelera") === "1" && auth.ctx.rol === "admin")) query = query.is("deleted_at", null);

  const q = limpiar(sp.get("q") ?? "");
  if (q && r.buscar?.length) query = query.or(r.buscar.map((c) => `${c}.ilike.*${q}*`).join(","));

  for (const [k, v] of sp.entries()) {
    if (k.startsWith("f.")) {
      const c = k.slice(2);
      if (!COLUMNA.test(c) || !(r.filtros ?? []).includes(c)) continue;
      if (v === "null") query = query.is(c, null);
      else if (v.includes(",")) query = query.in(c, v.split(",").slice(0, 50));
      else query = query.eq(c, v);
    } else if (k.startsWith("r.")) {
      const c = k.slice(2);
      if (!COLUMNA.test(c) || ![...(r.ordenables ?? []), ...(r.filtros ?? [])].includes(c)) continue;
      const [desde, hasta] = v.split("..");
      if (desde) query = query.gte(c, desde);
      if (hasta) query = query.lte(c, hasta);
    }
  }

  const { data, error, count } = await query.order(col, { ascending: asc, nullsFirst: false })
    .range((page - 1) * size, page * size - 1);
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  return json({ datos: data ?? [], total: count ?? 0, page, size });
}

// POST /api/gestion/:recurso — crea (validación Zod; RLS decide)
export async function POST(req: Request, { params }: Ctx) {
  const r = resolver((await params).recurso);
  if (!r?.crear) return json({ error: "Operación no permitida" }, 405);
  const auth = await requireStaff({ admin: r.soloAdmin });
  if ("error" in auth) return auth.error;

  const cuerpo = await req.json().catch(() => null);
  const parsed = r.crear.safeParse(cuerpo);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos", campos: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  const fila: Record<string, unknown> = { ...parsed.data };
  if (r.autor) fila[r.autor] = auth.ctx.empleado_id;
  // id generado en el cliente (modo sin conexión): reintentar el mismo alta no duplica registros
  const idCliente = !r.pk && esUuid(cuerpo?.id) ? cuerpo.id : null;
  if (idCliente) fila.id = idCliente;

  const { data, error } = await auth.db.from(r.tabla).insert(fila).select(r.select).single();
  if (error) {
    if (idCliente && error.code === "23505") {
      const { data: previo } = await auth.db.from(r.tabla).select(r.select).eq("id", idCliente).maybeSingle();
      if (previo) return json({ dato: previo, repetido: true }, 200);
    }
    const [m, s] = mensajeError(error); return json({ error: m }, s);
  }
  return json({ dato: data }, 201);
}

// DELETE /api/gestion/:recurso?<pk1>=..&<pk2>=.. — solo para claves compuestas (relaciones)
export async function DELETE(req: Request, { params }: Ctx) {
  const r = resolver((await params).recurso);
  if (!r || !Array.isArray(r.pk) || r.borrar !== "hard") return json({ error: "Operación no permitida" }, 405);
  const auth = await requireStaff({ admin: r.soloAdmin });
  if ("error" in auth) return auth.error;
  const sp = new URL(req.url).searchParams;
  let query = auth.db.from(r.tabla).delete();
  for (const c of r.pk) {
    const v = sp.get(c);
    if (!v) return json({ error: `Falta ${c}` }, 400);
    query = query.eq(c, v);
  }
  const { data, error } = await query.select();
  if (error) { const [m, s] = mensajeError(error); return json({ error: m }, s); }
  if (!data?.length) return json({ error: "No encontrado o sin permiso" }, 404);
  return json({ ok: true });
}
