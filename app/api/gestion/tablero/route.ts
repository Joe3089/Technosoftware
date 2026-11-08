import { json } from "@/lib/api";
import { requireStaff, esUuid } from "@/lib/permissions";

const DIA = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const lunes = (t: number) => { const d = new Date(t); const w = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - w); };
const aT = (s: string) => Date.parse(`${s}T00:00:00Z`);

type Tarea = { responsable_id: string; inicio: string | null; fin: string | null; duracion_estimada: number | null; estado: string;
  responsable: { id: string; nombre: string; apellido: string; rol_sistema: string } | null };

// GET /api/gestion/tablero?semanas=10&depto=&persona= — widgets del tablero de inicio:
// línea de tiempo de proyectos, estado de proyectos, carga de trabajo (persona × semana) y presupuesto vs gastos.
// Todo con la sesión del usuario: RLS limita lo que cada rol ve.
export async function GET(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const { db, ctx } = auth;
  const sp = new URL(req.url).searchParams;
  const semanas = Math.min(Math.max(Number(sp.get("semanas")) || 10, 4), 26);
  const depto = sp.get("depto"), persona = sp.get("persona");
  const desde = lunes(Date.now()) - 7 * DIA;

  let qp = db.from("proyectos").select("id, codigo, nombre, estado, etapa, avance, inicio_plan, fin_plan, fecha_inicio, fecha_fin, presupuesto, moneda, departamento_id")
    .is("deleted_at", null).order("inicio_plan", { ascending: true, nullsFirst: false }).limit(200);
  if (esUuid(depto)) qp = qp.eq("departamento_id", depto);
  let qt = db.from("tareas").select("responsable_id, inicio, fin, duracion_estimada, estado, responsable:empleados!tareas_responsable_id_fkey(id,nombre,apellido,rol_sistema)")
    .is("deleted_at", null).not("responsable_id", "is", null).not("estado", "in", "(completada,cancelada)")
    .or(`fin.gte.${iso(desde)},inicio.gte.${iso(desde)}`).limit(3000); // el solapamiento con la ventana se calcula abajo
  if (esUuid(depto)) qt = qt.eq("departamento_id", depto);
  if (esUuid(persona)) qt = qt.eq("responsable_id", persona);

  const fin = ctx.permisos.includes("finanzas.ver");
  const [proy, tar, pagos, regs] = await Promise.all([
    qp, qt,
    fin ? db.from("pagos_factura").select("monto, factura:facturas!pagos_factura_factura_id_fkey(tipo, proyecto_id)").limit(20000) : Promise.resolve({ data: [] }),
    fin ? db.from("finanzas_registros").select("monto, proyecto_id").eq("tipo", "gasto").eq("anulado", false).not("proyecto_id", "is", null).limit(20000) : Promise.resolve({ data: [] }),
  ]);
  const proyectos = (proy.data ?? []) as { id: string; codigo: string; nombre: string; estado: string; presupuesto: number | null; moneda: string }[];

  // Carga de trabajo: cada actividad reparte sus horas estimadas (8 h si no tiene) entre las semanas que abarca
  const inicioSem = Array.from({ length: semanas }, (_, i) => desde + i * 7 * DIA);
  const filas = new Map<string, { empleado: Tarea["responsable"]; celdas: { n: number; horas: number }[] }>();
  for (const t of (tar.data ?? []) as unknown as Tarea[]) {
    if (!t.responsable) continue;
    const a = aT(t.inicio ?? t.fin!), b = Math.max(a, aT(t.fin ?? t.inicio!));
    const idx = inicioSem.map((s, i) => (s <= b && s + 7 * DIA - DIA >= a ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    const f = filas.get(t.responsable_id) ?? { empleado: t.responsable, celdas: inicioSem.map(() => ({ n: 0, horas: 0 })) };
    const horas = Number(t.duracion_estimada ?? 8) / idx.length;
    for (const i of idx) { f.celdas[i].n++; f.celdas[i].horas = Math.round((f.celdas[i].horas + horas) * 10) / 10; }
    filas.set(t.responsable_id, f);
  }

  // Presupuesto vs gastos por proyecto
  let presupuesto = null;
  if (fin) {
    const gastos: Record<string, number> = {};
    for (const p of (pagos.data ?? []) as unknown as { monto: number; factura: { tipo: string; proyecto_id: string | null } | null }[])
      if (p.factura?.tipo === "recibida" && p.factura.proyecto_id) gastos[p.factura.proyecto_id] = (gastos[p.factura.proyecto_id] ?? 0) + Number(p.monto);
    for (const r of (regs.data ?? []) as { monto: number; proyecto_id: string }[]) gastos[r.proyecto_id] = (gastos[r.proyecto_id] ?? 0) + Number(r.monto);
    presupuesto = proyectos.filter((p) => p.presupuesto || gastos[p.id])
      .map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, moneda: p.moneda, presupuesto: Number(p.presupuesto ?? 0), gastos: gastos[p.id] ?? 0 }))
      .sort((a, b) => b.presupuesto - a.presupuesto).slice(0, 8);
  }

  const estados: Record<string, number> = {};
  for (const p of proyectos) estados[p.estado] = (estados[p.estado] ?? 0) + 1;

  return json({
    proyectos: proy.data ?? [], estados,
    carga: { semanas: inicioSem.map(iso), filas: [...filas.values()].sort((a, b) => (a.empleado!.nombre).localeCompare(b.empleado!.nombre)) },
    presupuesto,
  });
}
