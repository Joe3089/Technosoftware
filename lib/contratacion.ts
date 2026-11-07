// Shared (client + server) rules for budget → contract → final meeting → survey → review.

export interface ItemPresupuesto { concepto: string; cantidad: number; precio: number }

export interface Presupuesto {
  id: string; items: ItemPresupuesto[]; total: number; moneda: string; notas: string | null;
  valido_hasta: string | null; estado: "enviado" | "aprobado" | "rechazado"; motivo_rechazo: string | null;
  respondido_at: string | null; updated_at: string;
}

export type EstadoContrato = "pendiente_aprobacion" | "aprobado" | "descargado" | "firmado" | "verificado" | "firma_rechazada";
export interface Contrato {
  id: string; estado: EstadoContrato; observacion: string | null; tieneFirmado: boolean;
  aprobado_at: string | null; descargado_at: string | null; firmado_at: string | null; verificado_at: string | null; updated_at: string;
}

export const CONTRATO_LABEL: Record<EstadoContrato, string> = {
  pendiente_aprobacion: "Pendiente de aprobación", aprobado: "Aprobado · descárgalo para firmar",
  descargado: "Descargado · sube la copia firmada", firmado: "Firmado · en verificación",
  verificado: "Firmado y verificado", firma_rechazada: "Firma rechazada · súbelo de nuevo",
};

export const PREGUNTAS_ENCUESTA = [
  { id: "general", label: "Satisfacción general con el servicio" },
  { id: "calidad", label: "Calidad del producto entregado" },
  { id: "comunicacion", label: "Comunicación con el equipo" },
  { id: "plazos", label: "Cumplimiento de plazos" },
  { id: "soporte", label: "Atención y soporte" },
] as const;

export const totalItems = (items: ItemPresupuesto[]) =>
  Math.round(items.reduce((s, i) => s + i.cantidad * i.precio, 0) * 100) / 100;

/** Validates budget lines: 1–50 items with a concept, quantity > 0 and price ≥ 0. */
export function validarItems(v: unknown): ItemPresupuesto[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > 50) return null;
  const out: ItemPresupuesto[] = [];
  for (const i of v) {
    const concepto = typeof i?.concepto === "string" ? i.concepto.trim().slice(0, 200) : "";
    const cantidad = Number(i?.cantidad), precio = Number(i?.precio);
    if (!concepto || !(cantidad > 0) || !(precio >= 0) || !Number.isFinite(cantidad * precio)) return null;
    out.push({ concepto, cantidad, precio: Math.round(precio * 100) / 100 });
  }
  return out;
}
