import { json } from "@/lib/api";
import { requireStaff } from "@/lib/permissions";

// GET /api/gestion/buscar?q= — buscador global. Cada consulta pasa por RLS: solo aparece lo que el usuario puede ver.
const FUENTES = [
  { tipo: "Actividad", tabla: "tareas", cols: "id, titulo", campos: ["titulo"], soft: true, href: (r: Fila) => `/dashboard/planificacion?tarea=${r.id}`, txt: (r: Fila) => r.titulo },
  { tipo: "Proyecto", tabla: "proyectos", cols: "id, codigo, nombre", campos: ["nombre", "codigo"], href: (r: Fila) => `/dashboard/proyectos/${r.id}`, txt: (r: Fila) => `${r.codigo} · ${r.nombre}` },
  { tipo: "Contacto", tabla: "contactos", cols: "id, nombre, apellido, empresa", campos: ["nombre", "apellido", "empresa", "email"], soft: true, href: () => `/dashboard/contactos`, txt: (r: Fila) => `${r.nombre} ${r.apellido ?? ""}${r.empresa ? ` · ${r.empresa}` : ""}` },
  { tipo: "Cliente", tabla: "clientes", cols: "id, nombre, empresa", campos: ["nombre", "empresa", "email"], href: () => `/dashboard/clientes`, txt: (r: Fila) => `${r.nombre}${r.empresa ? ` · ${r.empresa}` : ""}` },
  { tipo: "Oportunidad", tabla: "oportunidades", cols: "id, titulo", campos: ["titulo"], soft: true, href: () => `/dashboard/crm`, txt: (r: Fila) => r.titulo },
  { tipo: "Ticket", tabla: "tickets", cols: "id, numero, titulo", campos: ["titulo"], href: (r: Fila) => `/dashboard/soporte?ticket=${r.id}`, txt: (r: Fila) => `#${r.numero} · ${r.titulo}` },
  { tipo: "Empleado", tabla: "empleados", cols: "id, nombre, apellido", campos: ["nombre", "apellido", "email_corporativo"], href: (r: Fila) => `/dashboard/empleados/${r.id}`, txt: (r: Fila) => `${r.nombre} ${r.apellido ?? ""}` },
] as const;
type Fila = Record<string, string>;

export async function GET(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[,()*%\\:"'.]/g, " ").trim().slice(0, 60);
  if (q.length < 2) return json({ datos: [] });

  const res = await Promise.all(FUENTES.map(async (f) => {
    let query = auth.db.from(f.tabla).select(f.cols).or(f.campos.map((c) => `${c}.ilike.*${q}*`).join(",")).limit(5);
    if ("soft" in f && f.soft) query = query.is("deleted_at", null);
    const { data } = await query;
    return ((data ?? []) as unknown as Fila[]).map((r) => ({ tipo: f.tipo, texto: f.txt(r), href: f.href(r) }));
  }));
  return json({ datos: res.flat() });
}
