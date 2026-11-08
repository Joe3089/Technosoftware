import { json } from "@/lib/api";
import { requireStaff } from "@/lib/gestion/servidor";

const ABIERTAS = "(completada,cancelada)";
const hoyISO = () => new Date().toISOString().slice(0, 10);
const masDias = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

// GET /api/gestion/resumen — números del dashboard. Todo pasa por RLS, así que cada rol ve su alcance.
export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { db, ctx } = auth;
  const hoy = hoyISO();
  const { data: par } = await db.from("parametros").select("valor").eq("clave", "actividades.dias_aviso").maybeSingle();
  const limite = masDias(Number(par?.valor) || 3);
  const me = ctx.empleado_id;
  const cnt = { count: "exact" as const, head: true };
  const tareasCols = "id, titulo, fin, estado, prioridad, responsable:empleados!tareas_responsable_id_fkey(nombre,apellido), proyecto:proyectos!tareas_proyecto_id_fkey(codigo)";

  // ── Personal ──
  const personal = me ? await Promise.all([
    db.from("tareas").select(tareasCols).eq("responsable_id", me).is("deleted_at", null).not("estado", "in", ABIERTAS).order("fin", { ascending: true, nullsFirst: false }).limit(8),
    db.from("tareas").select("id", cnt).eq("responsable_id", me).is("deleted_at", null).eq("estado", "completada").gte("completada_at", masDias(-30)),
    db.from("proyecto_equipo").select("proyecto:proyectos!proyecto_equipo_proyecto_id_fkey(id,codigo,nombre,etapa,avance,estado)").eq("empleado_id", me).limit(8),
  ]) : null;

  // ── Empresa (lo visible según permisos) ──
  const verEmpresa = ctx.rol !== "empleado";
  const fin = ctx.permisos.includes("finanzas.ver");
  const mesIni = hoy.slice(0, 8) + "01";
  const [emp, pAct, pPend, pCulm, vencidas, proximas, porDepto, regs, pagos, cxc, tUrg, deps] = verEmpresa ? await Promise.all([
    db.from("empleados").select("id", cnt).eq("estado", "activo").is("deleted_at", null),
    db.from("proyectos").select("id", cnt).in("estado", ["en_progreso", "revision"]).is("deleted_at", null),
    db.from("proyectos").select("id", cnt).eq("estado", "pendiente").is("deleted_at", null),
    db.from("proyectos").select("id", cnt).eq("estado", "completado").is("deleted_at", null),
    db.from("tareas").select(tareasCols, { count: "exact" }).is("deleted_at", null).not("estado", "in", ABIERTAS).lt("fin", hoy).order("fin").limit(8),
    db.from("tareas").select(tareasCols, { count: "exact" }).is("deleted_at", null).not("estado", "in", ABIERTAS).gte("fin", hoy).lte("fin", limite).order("fin").limit(8),
    db.from("tareas").select("departamento_id, estado, fin").is("deleted_at", null).not("estado", "in", ABIERTAS).limit(2000),
    fin ? db.from("finanzas_registros").select("tipo, monto").eq("anulado", false).gte("fecha", mesIni).limit(5000) : Promise.resolve({ data: [] }),
    fin ? db.from("pagos_factura").select("monto, factura:facturas!pagos_factura_factura_id_fkey(tipo)").gte("fecha", mesIni).limit(5000) : Promise.resolve({ data: [] }),
    fin ? db.from("facturas").select("total, pagado, fecha_vencimiento").eq("tipo", "emitida").in("estado", ["emitida", "parcial"]).limit(5000) : Promise.resolve({ data: [] }),
    db.from("tickets").select("id", cnt).eq("prioridad", "urgente").not("estado", "in", "(resuelto,cerrado)"),
    db.from("departamentos").select("id, nombre, codigo, padre_id").eq("activo", true).order("orden"),
  ]) : [];

  let empresa = null;
  if (verEmpresa) {
    let ingresos = 0, gastos = 0;
    for (const r of (regs?.data ?? []) as { tipo: string; monto: number }[]) r.tipo === "ingreso" ? (ingresos += Number(r.monto)) : (gastos += Number(r.monto));
    for (const p of (pagos?.data ?? []) as unknown as { monto: number; factura: { tipo: string } | null }[])
      p.factura?.tipo === "emitida" ? (ingresos += Number(p.monto)) : (gastos += Number(p.monto));
    let porCobrar = 0, vencidoCobrar = 0;
    for (const f of (cxc?.data ?? []) as { total: number; pagado: number; fecha_vencimiento: string | null }[]) {
      const saldo = Number(f.total) - Number(f.pagado);
      porCobrar += saldo;
      if (f.fecha_vencimiento && f.fecha_vencimiento < hoy) vencidoCobrar += saldo;
    }
    // Estado por área principal (sub-áreas agregadas a su área)
    const deptos = (deps?.data ?? []) as { id: string; nombre: string; codigo: string; padre_id: string | null }[];
    const raiz = deptos.find((d) => !d.padre_id)?.id;
    const area = (id: string | null): string | null => {
      let d = deptos.find((x) => x.id === id);
      while (d && d.padre_id && d.padre_id !== raiz) d = deptos.find((x) => x.id === d!.padre_id);
      return d?.id ?? null;
    };
    const estado: Record<string, { abiertas: number; vencidas: number; bloqueadas: number }> = {};
    for (const t of (porDepto?.data ?? []) as { departamento_id: string | null; estado: string; fin: string | null }[]) {
      const a = area(t.departamento_id) ?? "sin";
      estado[a] ??= { abiertas: 0, vencidas: 0, bloqueadas: 0 };
      estado[a].abiertas++;
      if (t.fin && t.fin < hoy) estado[a].vencidas++;
      if (t.estado === "bloqueada") estado[a].bloqueadas++;
    }
    const alertas: string[] = [];
    if ((vencidas?.count ?? 0) > 0) alertas.push(`${vencidas!.count} actividad(es) vencida(s)`);
    if ((tUrg?.count ?? 0) > 0) alertas.push(`${tUrg!.count} ticket(s) urgente(s) sin resolver`);
    if (vencidoCobrar > 0) alertas.push(`Cuentas por cobrar vencidas: ${vencidoCobrar.toFixed(2)}`);
    for (const [id, e] of Object.entries(estado)) if (e.bloqueadas > 0)
      alertas.push(`${deptos.find((d) => d.id === id)?.nombre ?? "Sin departamento"}: ${e.bloqueadas} bloqueada(s)`);

    empresa = {
      empleados: emp?.count ?? 0, proyectosActivos: pAct?.count ?? 0, proyectosPendientes: pPend?.count ?? 0,
      proyectosCulminados: pCulm?.count ?? 0, vencidas: { total: vencidas?.count ?? 0, lista: vencidas?.data ?? [] },
      proximas: { total: proximas?.count ?? 0, lista: proximas?.data ?? [] },
      finanzas: fin ? { ingresos, gastos, porCobrar, vencidoCobrar } : null,
      departamentos: deptos.filter((d) => d.padre_id === raiz).map((d) => ({ ...d, ...(estado[d.id] ?? { abiertas: 0, vencidas: 0, bloqueadas: 0 }) })),
      alertas,
    };
  }

  return json({
    hoy, limite,
    personal: personal && {
      actividades: personal[0].data ?? [],
      completadas30: personal[1].count ?? 0,
      proyectos: (personal[2].data ?? []).map((x) => (x as unknown as { proyecto: unknown }).proyecto).filter(Boolean),
    },
    empresa,
  });
}
