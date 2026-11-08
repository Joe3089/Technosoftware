// Modo sin conexión + tiempo real de la gestión interna.
//  · GET: red primero; si no hay red, copia local (tablas descargadas + cambios pendientes).
//  · Altas/ediciones/bajas sin red: se encolan, se muestran al instante y se envían en orden al volver.
//    Las altas llevan un id generado aquí, así reintentar nunca duplica registros.
//  · Con red: Supabase Realtime avisa de cada cambio visible para el usuario (auditoría + RLS).
import { borrar, borrarTodo, guardar, leer, todos } from "./idb";
import { buscarLocal, consultaLocal, partes, type Pendiente } from "./local";

export const RECURSOS_LOCALES = [
  "departamentos", "cargos", "empleados", "catalogos", "parametros", "proyectos", "proyecto_equipo", "proyecto_hitos", "proyecto_items",
  "proyecto_contactos", "contactos", "clientes", "tareas", "tarea_checklist", "tarea_comentarios", "tarea_colaboradores", "tarea_dependencias",
  "oportunidades", "crm_interacciones", "facturas", "pagos_factura", "finanzas_registros", "presupuestos_gestion", "tickets", "ticket_comentarios",
  "kpis", "kpi_mediciones", "archivos_gestion",
];
const ESPECIALES = ["/api/gestion/contexto", "/api/gestion/resumen", "/api/gestion/tablero?semanas=10", "/api/gestion/notificaciones", "/api/gestion/estadisticas"];
const PAGINAS = ["inicio", "planificacion", "proyectos", "contactos", "clientes", "crm", "empleados", "contabilidad", "estadisticas", "soporte", "configuracion"];

export class SinConexion extends Error {}
export const emitir = (tipo: string, detalle?: unknown) => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));
const enLinea = () => typeof navigator === "undefined" || navigator.onLine;

type Resultado = { ok: boolean; status: number; data: Record<string, unknown> };

async function red(url: string, init?: RequestInit): Promise<Resultado> {
  const res = await fetch(url, init); // lanza TypeError si no hay red
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const permiteCola = (url: string, metodo: string) =>
  !!partes(url) || (url.startsWith("/api/gestion/archivos") && metodo === "POST") || (url.startsWith("/api/gestion/notificaciones") && metodo === "PATCH");

/** Ejecuta una petición de la gestión interna con respaldo local. */
export async function peticion(url: string, init: RequestInit & { cuerpo?: unknown } = {}): Promise<Resultado> {
  const metodo = (init.method ?? "GET").toUpperCase();
  if (metodo === "GET") {
    try {
      const r = await red(url, init);
      if (r.ok && url.startsWith("/api/gestion/")) guardar("respuestas", url, r.data);
      return r;
    } catch {
      const local = partes(url) ? await consultaLocal(url)
        : url.startsWith("/api/gestion/buscar") ? await buscarLocal(new URL(url, "http://x").searchParams.get("q") ?? "")
        : await leer("respuestas", url);
      if (local) return { ok: true, status: 200, data: local as Record<string, unknown> };
      throw new SinConexion("Sin conexión: esta vista aún no tiene datos guardados en este equipo");
    }
  }

  if (!permiteCola(url, metodo)) {
    try { return await red(url, init); } catch { throw new SinConexion("Esta acción necesita conexión a internet"); }
  }
  // Respeta el orden: si hay cambios pendientes, se envían antes
  if (enLinea() && (await todos("cola")).length) await sincronizar();
  if (enLinea() && !(await todos("cola")).length) {
    try { return await red(url, init); } catch { /* sin red: se encola */ }
  }
  return encolar(url, metodo, init);
}

async function encolar(url: string, metodo: string, init: RequestInit & { cuerpo?: unknown }): Promise<Resultado> {
  const p = partes(url);
  const pend: Pendiente = { url, metodo, creado: new Date().toISOString(), recurso: p?.recurso ?? null, id: p?.id ?? null, cuerpo: init.cuerpo };
  if (init.body instanceof FormData) {
    const archivo = init.body.get("archivo") as File;
    pend.archivo = { campos: [...init.body.entries()].filter(([k]) => k !== "archivo").map(([k, v]) => [k, String(v)]), blob: archivo, nombre: archivo.name };
    pend.recurso = "archivos_gestion";
    pend.cuerpo = { id: crypto.randomUUID(), nombre: archivo.name, tamano: archivo.size, entidad: init.body.get("entidad"), entidad_id: init.body.get("entidad_id") };
  }
  await guardar("cola", undefined, pend);
  emitir("gestion:cola");
  emitir("gestion:cambio", { tablas: [pend.recurso] });
  const cuerpo = (pend.cuerpo ?? {}) as Record<string, unknown>;
  if (metodo === "DELETE") return { ok: true, status: 202, data: { ok: true, pendiente: true } };
  return { ok: true, status: 202, data: { dato: { ...(pend.id ? { id: pend.id } : {}), ...cuerpo, __pendiente: true }, pendiente: true } };
}

let sincronizando: Promise<{ enviados: number; fallidos: number }> | null = null;
/** Envía la cola en orden. Se detiene si se corta la red; los rechazos del servidor pasan a «fallidas». */
export function sincronizar() {
  sincronizando ??= (async () => {
    let enviados = 0, fallidos = 0;
    const tablas = new Set<string>();
    for (const p of (await todos<Pendiente>("cola")).sort((a, b) => a.n! - b.n!)) {
      let r: Resultado;
      try {
        if (p.archivo) {
          const fd = new FormData();
          for (const [k, v] of p.archivo.campos) fd.set(k, v);
          fd.set("archivo", new File([p.archivo.blob], p.archivo.nombre, { type: p.archivo.blob.type }));
          r = await red(p.url, { method: p.metodo, body: fd });
        } else {
          r = await red(p.url, { method: p.metodo, headers: p.cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: p.cuerpo !== undefined ? JSON.stringify(p.cuerpo) : undefined });
        }
      } catch { break; }
      if (r.ok || (p.metodo === "DELETE" && r.status === 404)) enviados++;
      else {
        fallidos++;
        const { n: _n, ...resto } = p; // la clave de «fallidas» se genera sola
        await guardar("fallidas", undefined, { ...resto, error: String(r.data.error ?? `Error ${r.status}`), intento: new Date().toISOString() });
      }
      await borrar("cola", p.n!);
      if (p.recurso) tablas.add(p.recurso);
    }
    if (enviados || fallidos) {
      await actualizarTablas([...tablas]);
      emitir("gestion:cambio", { tablas: [...tablas] });
      emitir("gestion:sincronizado", { enviados, fallidos });
    }
    await guardar("meta", "ultimaSync", new Date().toISOString());
    emitir("gestion:cola");
    return { enviados, fallidos };
  })().finally(() => { sincronizando = null; });
  return sincronizando;
}

/** Descarga (hasta 1000 filas por tabla) la copia local de las tablas que el usuario puede ver. */
export async function actualizarTablas(recursos = RECURSOS_LOCALES) {
  if (!enLinea()) return;
  await Promise.all(recursos.filter((r) => RECURSOS_LOCALES.includes(r)).map(async (rec) => {
    const filas: unknown[] = [];
    for (let page = 1; page <= 5; page++) {
      let r: Resultado;
      try { r = await red(`/api/gestion/${rec}?size=200&page=${page}&papelera=1`); } catch { return; }
      if (!r.ok) { if (r.status === 403) await borrar("tablas", rec); return; }
      filas.push(...((r.data.datos as unknown[]) ?? []));
      if (filas.length >= Number(r.data.total ?? 0)) break;
    }
    await guardar("tablas", rec, { filas, at: new Date().toISOString() });
  }));
  await guardar("meta", "ultimaDescarga", new Date().toISOString());
}

/** Prepara el equipo para trabajar sin conexión: datos, vistas especiales y páginas. */
export async function precargar(usuario: string) {
  if ((await leer<string>("meta", "usuario")) !== usuario) { await borrarTodo(); await guardar("meta", "usuario", usuario); }
  if (!enLinea()) return;
  await sincronizar();
  await actualizarTablas();
  await Promise.all(ESPECIALES.map((u) => peticion(u).catch(() => null)));
  const proyectos = ((await leer<{ filas: { id: string }[] }>("tablas", "proyectos"))?.filas ?? []).slice(0, 40);
  const empleados = ((await leer<{ filas: { id: string }[] }>("tablas", "empleados"))?.filas ?? []).slice(0, 40);
  const urls = [...PAGINAS.map((p) => `/dashboard/${p}`), ...proyectos.map((p) => `/dashboard/proyectos/${p.id}`), ...empleados.map((e) => `/dashboard/empleados/${e.id}`)];
  for (const u of urls) await fetch(u, { headers: { Accept: "text/html", "X-Precarga": "1" } }).catch(() => null);
  emitir("gestion:cola");
}

export async function estadoCola() {
  const [cola, fallidas, ultimaSync, ultimaDescarga] = await Promise.all([todos("cola"), todos("fallidas"), leer<string>("meta", "ultimaSync"), leer<string>("meta", "ultimaDescarga")]);
  return { pendientes: cola.length, fallidas: fallidas as (Pendiente & { error: string; n: number })[], ultimaSync, ultimaDescarga };
}
export const descartarFallida = async (n: number) => { await borrar("fallidas", n); emitir("gestion:cola"); };
export { borrarTodo };
