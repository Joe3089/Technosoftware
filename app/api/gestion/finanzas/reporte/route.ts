import { json } from "@/lib/api";
import { requireStaff } from "@/lib/gestion/servidor";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
type Pago = { monto: number; fecha: string; factura: { tipo: string; proyecto_id: string | null } | null };
type Reg = { tipo: string; monto: number; categoria: string; fecha: string; proyecto_id: string | null };

// GET /api/gestion/finanzas/reporte?desde&hasta — flujo de caja (pagos de facturas + registros directos
// no anulados), cuentas por cobrar/pagar, rentabilidad por proyecto y gasto por categoría.
// Reporte de gestión: no sustituye la contabilidad fiscal.
export async function GET(req: Request) {
  const auth = await requireStaff({ permiso: "finanzas.ver" });
  if ("error" in auth) return auth.error;
  const { db } = auth;
  const sp = new URL(req.url).searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = ISO.test(sp.get("desde") ?? "") ? sp.get("desde")! : hoy.slice(0, 5) + "01-01";
  const hasta = ISO.test(sp.get("hasta") ?? "") ? sp.get("hasta")! : hoy;

  const [pagos, regs, abiertas, proyectos] = await Promise.all([
    db.from("pagos_factura").select("monto, fecha, factura:facturas!pagos_factura_factura_id_fkey(tipo, proyecto_id)").gte("fecha", desde).lte("fecha", hasta).limit(20000),
    db.from("finanzas_registros").select("tipo, monto, categoria, fecha, proyecto_id").eq("anulado", false).gte("fecha", desde).lte("fecha", hasta).limit(20000),
    db.from("facturas").select("tipo, total, pagado, fecha_vencimiento").in("estado", ["emitida", "parcial"]).limit(20000),
    db.from("proyectos").select("id, codigo, nombre, presupuesto").is("deleted_at", null).limit(2000),
  ]);

  const meses: Record<string, { ingresos: number; gastos: number }> = {};
  const porProyecto: Record<string, { ingresos: number; gastos: number }> = {};
  const porCategoria: Record<string, number> = {};
  const sumar = (mes: string, tipo: "ingresos" | "gastos", monto: number, proyecto: string | null) => {
    (meses[mes] ??= { ingresos: 0, gastos: 0 })[tipo] += monto;
    if (proyecto) (porProyecto[proyecto] ??= { ingresos: 0, gastos: 0 })[tipo] += monto;
  };
  for (const p of (pagos.data ?? []) as unknown as Pago[])
    sumar(p.fecha.slice(0, 7), p.factura?.tipo === "emitida" ? "ingresos" : "gastos", Number(p.monto), p.factura?.proyecto_id ?? null);
  for (const r of (regs.data ?? []) as Reg[]) {
    sumar(r.fecha.slice(0, 7), r.tipo === "ingreso" ? "ingresos" : "gastos", Number(r.monto), r.proyecto_id);
    if (r.tipo === "gasto") porCategoria[r.categoria] = (porCategoria[r.categoria] ?? 0) + Number(r.monto);
  }

  const cartera = { cobrar: 0, cobrarVencido: 0, pagar: 0, pagarVencido: 0 };
  for (const f of (abiertas.data ?? []) as { tipo: string; total: number; pagado: number; fecha_vencimiento: string | null }[]) {
    const saldo = Number(f.total) - Number(f.pagado);
    const vencida = !!f.fecha_vencimiento && f.fecha_vencimiento < hoy;
    if (f.tipo === "emitida") { cartera.cobrar += saldo; if (vencida) cartera.cobrarVencido += saldo; }
    else { cartera.pagar += saldo; if (vencida) cartera.pagarVencido += saldo; }
  }

  const proy = (proyectos.data ?? []) as { id: string; codigo: string; nombre: string; presupuesto: number | null }[];
  const rentabilidad = Object.entries(porProyecto).map(([id, x]) => {
    const p = proy.find((y) => y.id === id);
    return {
      id, codigo: p?.codigo ?? "—", nombre: p?.nombre ?? "Proyecto", presupuesto: p?.presupuesto ?? null, ...x,
      margen: x.ingresos ? Math.round(((x.ingresos - x.gastos) / x.ingresos) * 1000) / 10 : null,
    };
  }).sort((a, b) => b.ingresos - a.ingresos);

  const totales = Object.values(meses).reduce((s, m) => ({ ingresos: s.ingresos + m.ingresos, gastos: s.gastos + m.gastos }), { ingresos: 0, gastos: 0 });
  return json({
    desde, hasta, totales, cartera, rentabilidad,
    meses: Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, x]) => ({ mes, ...x })),
    categorias: Object.entries(porCategoria).sort(([, a], [, b]) => b - a).map(([categoria, monto]) => ({ categoria, monto })),
  });
}
