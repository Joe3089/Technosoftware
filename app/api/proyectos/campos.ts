import { str } from "@/lib/api";
import { FASES } from "@/lib/proyectos";

const isDate = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v));

/** Validates the optional tracking fields an admin may set on a project. */
export function camposSeguimiento(body: Record<string, unknown>):
  { campos: Record<string, unknown> } | { error: string } {
  const campos: Record<string, unknown> = {};
  if ("fase" in body) {
    if (body.fase !== null && !FASES.some((f) => f.id === body.fase)) return { error: "Fase inválida" };
    campos.fase = body.fase;
  }
  if ("avance" in body) {
    const n = body.avance;
    if (n !== null && !(Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 100))
      return { error: "El avance debe ser un entero entre 0 y 100" };
    campos.avance = n;
  }
  if ("responsable" in body) campos.responsable = str(body.responsable, 120);
  for (const k of ["fecha_inicio", "fecha_fin", "reunion_final_at"] as const) {
    if (!(k in body)) continue;
    if (body[k] !== null && !isDate(body[k])) return { error: `${k} inválida` };
    campos[k] = body[k] === null ? null : new Date(body[k] as string).toISOString();
  }
  return { campos };
}
