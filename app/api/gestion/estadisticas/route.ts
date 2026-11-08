import { json } from "@/lib/api";
import { requireStaff } from "@/lib/permissions";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dias = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const r2 = (n: number | null) => (n == null || !isFinite(n) ? null : Math.round(n * 100) / 100);

// GET /api/gestion/estadisticas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Valores automáticos de los KPI con "clave". Solo se calculan los que el usuario puede ver;
// el resto vuelve como null (nunca 0 engañoso).
export async function GET(req: Request) {
  const auth = await requireStaff({ permiso: "kpi.ver" });
  if ("error" in auth) return auth.error;
  const { db, ctx } = auth;
  const sp = new URL(req.url).searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = ISO.test(sp.get("desde") ?? "") ? sp.get("desde")! : hoy.slice(0, 8) + "01";
  const hasta = ISO.test(sp.get("hasta") ?? "") ? sp.get("hasta")! : hoy;
  const finExcl = new Date(new Date(hasta).getTime() + 86400000).toISOString().slice(0, 10);
  const puede = (p: string) => ctx.permisos.includes(p);
  const v: Record<string, number | null> = {};

  if (puede("crm.ver")) {
    const [nuevas, cerradas, abiertas] = await Promise.all([
      db.from("oportunidades").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", desde).lt("created_at", finExcl),
      db.from("oportunidades").select("etapa, valor, created_at, cerrada_at").is("deleted_at", null).in("etapa", ["ganado", "perdido"]).gte("cerrada_at", desde).lt("cerrada_at", finExcl).limit(5000),
      db.from("oportunidades").select("valor, probabilidad").is("deleted_at", null).not("etapa", "in", "(ganado,perdido)").limit(5000),
    ]);
    const c = (cerradas.data ?? []) as { etapa: string; valor: number; created_at: string; cerrada_at: string }[];
    const ganadas = c.filter((x) => x.etapa === "ganado");
    const valorGanado = ganadas.reduce((s, x) => s + Number(x.valor), 0);
    v.com_leads = nuevas.count ?? 0;
    v.com_cierres = ganadas.length;
    v.com_conversion = c.length ? r2((ganadas.length / c.length) * 100) : null;
    v.com_pipeline = r2(((abiertas.data ?? []) as { valor: number; probabilidad: number }[]).reduce((s, x) => s + Number(x.valor) * x.probabilidad / 100, 0));
    v.com_ciclo = r2(prom(ganadas.map((x) => dias(x.created_at, x.cerrada_at))));
    v.com_ticket = ganadas.length ? r2(valorGanado / ganadas.length) : null;
  }

  const [tareas, tickets] = await Promise.all([
    db.from("tareas").select("created_at, completada_at").is("deleted_at", null).eq("estado", "completada").gte("completada_at", desde).lt("completada_at", finExcl).limit(5000),
    db.from("tickets").select("created_at, resuelto_at").gte("resuelto_at", desde).lt("resuelto_at", finExcl).limit(5000),
  ]);
  const t = (tareas.data ?? []) as { created_at: string; completada_at: string }[];
  v.tec_entregas = t.length;
  v.tec_ciclo = r2(prom(t.map((x) => dias(x.created_at, x.completada_at))));
  v.tec_mttr = r2(prom(((tickets.data ?? []) as { created_at: string; resuelto_at: string }[]).map((x) => dias(x.created_at, x.resuelto_at) * 24)));

  if (puede("estadisticas.ver")) {
    const [enc, items] = await Promise.all([
      db.from("encuestas").select("general").gte("created_at", desde).lt("created_at", finExcl).limit(5000),
      db.from("proyecto_items").select("estado").eq("tipo", "entregable").neq("estado", "descartado").limit(5000),
    ]);
    v.cons_satisfaccion = r2(prom(((enc.data ?? []) as { general: number }[]).map((x) => x.general)));
    const it = (items.data ?? []) as { estado: string }[];
    v.cons_cumplimiento = it.length ? r2((it.filter((x) => x.estado === "cumplido").length / it.length) * 100) : null;
  }

  if (puede("finanzas.ver")) {
    const [regs, pagos, cxc, pagadas, presup] = await Promise.all([
      db.from("finanzas_registros").select("tipo, monto").eq("anulado", false).gte("fecha", desde).lte("fecha", hasta).limit(10000),
      db.from("pagos_factura").select("monto, factura:facturas!pagos_factura_factura_id_fkey(tipo)").gte("fecha", desde).lte("fecha", hasta).limit(10000),
      db.from("facturas").select("total, pagado").eq("tipo", "emitida").in("estado", ["emitida", "parcial"]).limit(10000),
      db.from("facturas").select("fecha_emision, updated_at").eq("tipo", "emitida").eq("estado", "pagada").gte("updated_at", desde).lt("updated_at", finExcl).limit(5000),
      db.from("presupuestos_gestion").select("monto, departamento_id, proyecto_id").lte("periodo_inicio", hasta).gte("periodo_fin", desde).limit(5000),
    ]);
    let ing = 0, gas = 0;
    for (const x of (regs.data ?? []) as { tipo: string; monto: number }[]) x.tipo === "ingreso" ? (ing += Number(x.monto)) : (gas += Number(x.monto));
    for (const p of (pagos.data ?? []) as unknown as { monto: number; factura: { tipo: string } | null }[])
      p.factura?.tipo === "emitida" ? (ing += Number(p.monto)) : (gas += Number(p.monto));
    const presupuesto = ((presup.data ?? []) as { monto: number }[]).reduce((s, x) => s + Number(x.monto), 0);
    v.fin_flujo = r2(ing - gas);
    v.fin_margen = ing ? r2(((ing - gas) / ing) * 100) : null;
    v.fin_cxc = r2(((cxc.data ?? []) as { total: number; pagado: number }[]).reduce((s, f) => s + Number(f.total) - Number(f.pagado), 0));
    v.fin_cobro = r2(prom(((pagadas.data ?? []) as { fecha_emision: string; updated_at: string }[]).map((f) => dias(f.fecha_emision, f.updated_at))));
    v.fin_desviacion = presupuesto ? r2(((gas - presupuesto) / presupuesto) * 100) : null;
  }

  if (puede("empleados.gestionar")) {
    const [emps, evals] = await Promise.all([
      db.from("empleados").select("estado, fecha_ingreso, fecha_desvinculacion").is("deleted_at", null).limit(5000),
      db.from("empleado_evaluaciones").select("puntaje, empleado:empleados!empleado_evaluaciones_empleado_id_fkey(fecha_ingreso)").limit(5000),
    ]);
    const e = (emps.data ?? []) as { estado: string; fecha_ingreso: string | null; fecha_desvinculacion: string | null }[];
    const salidas = e.filter((x) => x.fecha_desvinculacion && x.fecha_desvinculacion >= desde && x.fecha_desvinculacion <= hasta).length;
    const plantilla = e.filter((x) => x.estado !== "desvinculado").length + salidas;
    v.th_rotacion = plantilla ? r2((salidas / plantilla) * 100) : null;
    v.th_calidad = r2(prom(((evals.data ?? []) as unknown as { puntaje: number; empleado: { fecha_ingreso: string | null } | null }[])
      .filter((x) => x.empleado?.fecha_ingreso && x.empleado.fecha_ingreso >= desde && x.empleado.fecha_ingreso <= hasta).map((x) => Number(x.puntaje))));
  }

  return json({ desde, hasta, valores: v });
}
