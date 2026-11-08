// Resuelve consultas de /api/gestion sin conexión a partir de las tablas guardadas en el dispositivo,
// aplicando encima los cambios pendientes de enviar (cola).
import { leer, todos } from "./idb";

type Fila = Record<string, unknown> & { id?: string };
export interface Pendiente { n?: number; url: string; metodo: string; cuerpo?: unknown; archivo?: { campos: [string, string][]; blob: Blob; nombre: string }; creado: string; recurso: string | null; id: string | null }

/** /api/gestion/<recurso>[/<id>] → { recurso, id } (solo la API genérica). */
export function partes(url: string) {
  const u = new URL(url, "http://x");
  const m = u.pathname.match(/^\/api\/gestion\/([a-z_]+)(?:\/([^/]+))?$/);
  const ESPECIALES = ["contexto", "resumen", "tablero", "buscar", "notificaciones", "estadisticas", "historial", "archivos", "personal", "finanzas"];
  if (!m || ESPECIALES.includes(m[1])) return null;
  return { recurso: m[1], id: m[2] ? decodeURIComponent(m[2]) : null, params: u.searchParams };
}

async function conPendientes(recurso: string, filas: Fila[]) {
  const cola = (await todos<Pendiente>("cola")).filter((p) => p.recurso === recurso);
  let r = [...filas];
  for (const p of cola) {
    if (p.metodo === "POST" && p.cuerpo && typeof p.cuerpo === "object") {
      const nuevo = { ...(p.cuerpo as Fila), __pendiente: true, created_at: p.creado };
      if (!r.some((x) => x.id && x.id === nuevo.id)) r = [nuevo, ...r];
    } else if (p.metodo === "PATCH" && p.id) {
      r = r.map((x) => (String(x.id) === p.id ? { ...x, ...(p.cuerpo as Fila), __pendiente: true } : x));
    } else if (p.metodo === "DELETE" && p.id) {
      r = r.filter((x) => String(x.id) !== p.id);
    }
  }
  return r;
}

const texto = (v: unknown): string => (v == null ? "" : typeof v === "object" ? Object.values(v as object).map(texto).join(" ") : String(v));

/** Responde una lista o un registro desde la copia local (filtros, búsqueda, rango, orden y paginación). */
export async function consultaLocal(url: string): Promise<unknown | null> {
  const p = partes(url);
  if (!p) return null;
  const tabla = await leer<{ filas: Fila[] }>("tablas", p.recurso);
  if (!tabla) return null;
  let filas = await conPendientes(p.recurso, tabla.filas);
  if (p.id) {
    const f = filas.find((x) => String(x.id ?? x.clave ?? x.empleado_id) === p.id);
    return f ? { dato: f, local: true } : null;
  }
  const sp = p.params;
  if (sp.get("papelera") !== "1") filas = filas.filter((f) => !f.deleted_at);
  for (const [k, v] of sp.entries()) {
    if (k.startsWith("f.")) {
      const c = k.slice(2);
      if (v === "null") filas = filas.filter((f) => f[c] == null);
      else { const vals = v.split(","); filas = filas.filter((f) => vals.includes(String(f[c]))); }
    } else if (k.startsWith("r.")) {
      const c = k.slice(2); const [a, b] = v.split("..");
      filas = filas.filter((f) => f[c] != null && (!a || String(f[c]) >= a) && (!b || String(f[c]).slice(0, b.length) <= b));
    }
  }
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  if (q) filas = filas.filter((f) => texto(f).toLowerCase().includes(q));
  const orden = sp.get("orden");
  if (orden) {
    const dir = sp.get("dir") === "desc" ? -1 : 1;
    filas.sort((a, b) => { const x = a[orden] ?? "", y = b[orden] ?? ""; return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  }
  const size = Math.min(Math.max(Number(sp.get("size")) || 25, 1), 200);
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  return { datos: filas.slice((page - 1) * size, page * size), total: filas.length, page, size, local: true };
}

/** Buscador global sin conexión sobre las tablas guardadas. */
export async function buscarLocal(q: string) {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return { datos: [] };
  const fuentes: [string, string, (f: Fila) => string, (f: Fila) => string][] = [
    ["tareas", "Actividad", (f) => String(f.titulo), (f) => `/dashboard/planificacion?tarea=${f.id}`],
    ["proyectos", "Proyecto", (f) => `${f.codigo} · ${f.nombre}`, (f) => `/dashboard/proyectos/${f.id}`],
    ["contactos", "Contacto", (f) => `${f.nombre} ${f.apellido ?? ""}`, () => "/dashboard/contactos"],
    ["clientes", "Cliente", (f) => String(f.nombre), () => "/dashboard/clientes"],
    ["oportunidades", "Oportunidad", (f) => String(f.titulo), () => "/dashboard/crm"],
    ["tickets", "Ticket", (f) => `#${f.numero} · ${f.titulo}`, (f) => `/dashboard/soporte?ticket=${f.id}`],
    ["empleados", "Empleado", (f) => `${f.nombre} ${f.apellido ?? ""}`, (f) => `/dashboard/empleados/${f.id}`],
  ];
  const datos = [];
  for (const [rec, tipo, txt, href] of fuentes) {
    const tabla = await leer<{ filas: Fila[] }>("tablas", rec);
    for (const f of (tabla?.filas ?? []).filter((x) => !x.deleted_at && txt(x).toLowerCase().includes(t)).slice(0, 5))
      datos.push({ tipo, texto: txt(f), href: href(f) });
  }
  return { datos };
}
