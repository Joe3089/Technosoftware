// Shared (client + server) project rules.

export const ESTADOS_PROYECTO = ["pendiente", "iniciado", "en_progreso", "revision", "completado", "cancelado"];

export const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Por iniciar", iniciado: "Iniciado", en_progreso: "En desarrollo",
  revision: "En revisión", completado: "Culminado", cancelado: "Cancelado",
};

/** Exclusive classification used by "Historial de proyectos". */
export const GRUPOS = {
  por_iniciar: { label: "Por iniciar", estados: ["pendiente"] },
  iniciados:   { label: "Iniciados",   estados: ["iniciado"] },
  en_proceso:  { label: "En proceso",  estados: ["en_progreso", "revision"] },
  culminados:  { label: "Culminados",  estados: ["completado"] },
  cancelados:  { label: "Cancelados",  estados: ["cancelado"] },
} as const;
export type Grupo = keyof typeof GRUPOS;

/** Active = started and not finished. */
export const ESTADOS_ACTIVOS = ["iniciado", "en_progreso", "revision"];

export const FASES = [
  { id: "analisis",   label: "Análisis" },
  { id: "diseno",     label: "Diseño" },
  { id: "desarrollo", label: "Desarrollo" },
  { id: "pruebas",    label: "Pruebas" },
  { id: "despliegue", label: "Despliegue" },
] as const;

export const TIPOS_OBSERVACION: Record<string, string> = {
  avance: "Avance", incidencia: "Incidencia", bloqueo: "Bloqueo", proximo_paso: "Próximo paso", cierre: "Cierre",
};

export interface ProyectoDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fase: string | null;
  avance: number | null;
  responsable: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  updated_at: string;
  created_at: string;
  cliente?: { email: string; full_name: string | null } | null;
}

export interface Observacion {
  id: number;
  tipo: string;
  texto: string;
  created_at: string;
  autor: { full_name: string | null; email: string } | null;
}

const DAY = 86_400_000;

/** Adds calendar months in UTC, clamping to the month's last day (Jan 31 + 1 → Feb 28/29). */
function addMonthsUTC(d: Date, n: number) {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + n);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/**
 * Elapsed calendar time between two instants (UTC-based, so DST never skews it).
 * Returns null when either date is missing — a duration is never guessed.
 */
export function duracion(inicio: string | null, fin: string | null) {
  if (!inicio || !fin) return null;
  const a = new Date(inicio), b = new Date(fin);
  const ms = b.getTime() - a.getTime();
  if (!(ms >= 0)) return null;

  const dias = Math.floor(ms / DAY);
  const horas = Math.floor(ms / 3_600_000);

  // Whole months by calendar (UTC), then remaining days
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  let ancla = addMonthsUTC(a, meses);
  if (ancla > b) ancla = addMonthsUTC(a, --meses);
  const resto = Math.floor((b.getTime() - ancla.getTime()) / DAY);

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  let texto: string;
  if (dias < 1) texto = plural(horas, "hora", "horas");
  else if (meses < 1) texto = plural(dias, "día", "días");
  else texto = `${plural(meses, "mes", "meses")}${resto ? ` y ${plural(resto, "día", "días")}` : ""}`;

  return { dias, horas, meses, resto, texto };
}
