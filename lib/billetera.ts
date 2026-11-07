export type TipoMovimiento = "abono" | "asignacion" | "consumo" | "reembolso";

export interface Movimiento {
  id: string;
  proyecto_id: string | null;
  tipo: TipoMovimiento;
  monto: number | string;
  metodo: string | null;
  referencia: string | null;
  descripcion: string | null;
  created_at: string;
}

export interface Proyecto { id: string; nombre: string; estado: string }

export interface ResumenProyecto extends Proyecto {
  asignado: number;   // asignaciones − reembolsos
  utilizado: number;  // consumos
  restante: number;   // asignado − utilizado
}

const cents = (v: number | string) => Math.round(Number(v) * 100);

/** Calcula la billetera a partir del libro de movimientos (cada movimiento se cuenta una sola vez). */
export function calcularBilletera(movs: Movimiento[], proyectos: Proyecto[]) {
  let disponible = 0;
  const porProyecto = new Map<string, { asignado: number; utilizado: number }>();

  for (const m of movs) {
    const c = cents(m.monto);
    if (m.tipo === "abono") { disponible += c; continue; }
    const p = porProyecto.get(m.proyecto_id!) ?? { asignado: 0, utilizado: 0 };
    if (m.tipo === "asignacion") { disponible -= c; p.asignado += c; }
    if (m.tipo === "reembolso")  { disponible += c; p.asignado -= c; }
    if (m.tipo === "consumo")    { p.utilizado += c; }
    porProyecto.set(m.proyecto_id!, p);
  }

  const resumen: ResumenProyecto[] = proyectos.map((pr) => {
    const p = porProyecto.get(pr.id) ?? { asignado: 0, utilizado: 0 };
    return { ...pr, asignado: p.asignado / 100, utilizado: p.utilizado / 100, restante: (p.asignado - p.utilizado) / 100 };
  });
  const comprometido = resumen.reduce((s, p) => s + cents(p.restante), 0);

  return {
    total: (disponible + comprometido) / 100,
    disponible: disponible / 100,
    comprometido: comprometido / 100,
    proyectos: resumen,
  };
}
