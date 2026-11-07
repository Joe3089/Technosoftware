import { isEmail, str } from "@/lib/api";

export const PRIORIDADES = ["baja", "media", "alta", "urgente"];
export const PLATAFORMAS = ["web", "movil", "escritorio", "otra"];

/** Reads a text field: trimmed, capped, and required when `req` is set. */
export function campo(body: Record<string, unknown>, k: string, max: number, req = false, errores?: string[]) {
  const v = str(body[k], max);
  if (req && !v) errores?.push(k);
  return v;
}

const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function fechaOpcional(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  return isIsoDate(v) ? v : undefined;  // undefined = invalid
}

function validZone(tz: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** Offset (ms) of a time zone at a given instant. */
function offsetAt(tz: string, instant: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant;
}

/**
 * Converts a wall-clock date/time in an IANA zone to a UTC instant.
 * Returns null for local times that don't exist (DST gaps).
 */
export function zonedToUtc(fecha: string, hora: string, tz: string): Date | null {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let t = wall - offsetAt(tz, wall);
  t = wall - offsetAt(tz, t);              // second pass settles DST boundaries
  return t + offsetAt(tz, t) === wall ? new Date(t) : null;
}

const PHONE = /^\+?[0-9\s().-]{7,20}$/;

export interface ReunionValida {
  telefono: string; canales: string[]; email_personal: string | null; email_corporativo: string | null;
  empresa: string | null; direccion: string | null; lat: number | null; lng: number | null; place_id: string | null;
  ubicacion_fuente: string | null; fecha_hora: string; zona_horaria: string; modalidad: string;
  motivo: string; observaciones: string | null;
}

/** Validates the meeting request sheet. Returns field-level errors (Spanish). */
export function validarReunion(b: Record<string, unknown> | null | undefined, ahora = Date.now()):
  { data: ReunionValida } | { errores: Record<string, string> } {
  const e: Record<string, string> = {};
  if (!b || typeof b !== "object") return { errores: { reunion: "Datos de reunión inválidos" } };

  const telefono = str(b.telefono, 20);
  if (!telefono || !PHONE.test(telefono) || telefono.replace(/\D/g, "").length < 7) e.telefono = "Teléfono inválido";

  const canales = Array.isArray(b.canales) ? [...new Set(b.canales)] : [];
  if (!canales.every((c) => c === "whatsapp" || c === "telegram")) e.canales = "Canal no válido";

  const ep = str(b.email_personal, 254), ec = str(b.email_corporativo, 254);
  if (ep && !isEmail(ep)) e.email_personal = "Correo inválido";
  if (ec && !isEmail(ec)) e.email_corporativo = "Correo inválido";
  if (!ep && !ec) e.email_personal = "Indica al menos un correo";

  const modalidad = b.modalidad === "presencial" ? "presencial" : "virtual";
  const direccion = str(b.direccion, 300);
  if (modalidad === "presencial" && !direccion) e.direccion = "La dirección es obligatoria para reuniones presenciales";

  let lat: number | null = null, lng: number | null = null;
  if (b.lat !== null && b.lat !== undefined) {
    lat = Number(b.lat); lng = Number(b.lng);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) e.direccion = "Coordenadas inválidas";
  }
  const fuente = ["google", "openstreetmap", "manual"].includes(b.ubicacion_fuente as string) ? (b.ubicacion_fuente as string) : (direccion ? "manual" : null);

  const zona = typeof b.zona_horaria === "string" && validZone(b.zona_horaria) ? b.zona_horaria : null;
  if (!zona) e.zona_horaria = "Zona horaria inválida";
  let fechaHora: Date | null = null;
  if (!isIsoDate(b.fecha) || typeof b.hora !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.hora)) e.fecha = "Fecha u hora inválida";
  else if (zona) {
    fechaHora = zonedToUtc(b.fecha, b.hora, zona);
    if (!fechaHora) e.fecha = "Esa hora no existe en tu zona horaria (cambio de horario)";
    else if (fechaHora.getTime() < ahora + 30 * 60_000) e.fecha = "Elige una fecha y hora futuras (al menos 30 minutos desde ahora)";
    else if (fechaHora.getTime() > ahora + 180 * 86_400_000) e.fecha = "Elige una fecha dentro de los próximos 6 meses";
  }

  const motivo = str(b.motivo, 1000);
  if (!motivo) e.motivo = "Indica el motivo de la reunión";

  if (Object.keys(e).length) return { errores: e };
  return {
    data: {
      telefono: telefono!, canales: canales as string[], email_personal: ep, email_corporativo: ec,
      empresa: str(b.empresa, 160), direccion, lat, lng, place_id: str(b.place_id, 300), ubicacion_fuente: fuente,
      fecha_hora: fechaHora!.toISOString(), zona_horaria: zona!, modalidad, motivo: motivo!, observaciones: str(b.observaciones, 1000),
    },
  };
}
