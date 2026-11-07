import { requireRole, json, str } from "@/lib/api";
import { PRIORIDADES, PLATAFORMAS, campo, fechaOpcional, validarReunion } from "@/lib/solicitudes";
import { guardarConReunion, listarPropias } from "@/lib/solicitudes-server";

// GET /api/solicitudes-proyecto — solicitudes de nuevo proyecto del usuario
export async function GET() {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  return listarPropias(auth.session, "solicitudes_proyecto", "id, codigo, nombre, prioridad, estado, created_at");
}

// POST /api/solicitudes-proyecto — levantamiento inicial (queda "pendiente de revisión")
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user } = auth.session;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return json({ error: "Solicitud inválida" }, 400);

  const faltan: string[] = [];
  const errores: Record<string, string> = {};
  const inicio = fechaOpcional(b.fecha_inicio_deseada), entrega = fechaOpcional(b.fecha_entrega);
  if (inicio === undefined) errores.fecha_inicio_deseada = "Fecha inválida";
  if (entrega === undefined) errores.fecha_entrega = "Fecha inválida";
  if (inicio && entrega && entrega < inicio) errores.fecha_entrega = "Debe ser posterior a la fecha de inicio";

  const plataformas = Array.isArray(b.plataformas) ? [...new Set(b.plataformas)].filter((p) => PLATAFORMAS.includes(p as string)) : [];
  if (!plataformas.length) errores.plataformas = "Selecciona al menos una plataforma";

  let presupuesto: number | null = null;
  if (b.presupuesto !== undefined && b.presupuesto !== null && b.presupuesto !== "") {
    presupuesto = Number(b.presupuesto);
    if (!Number.isFinite(presupuesto) || presupuesto < 0 || presupuesto > 1e9) errores.presupuesto = "Monto inválido";
  }

  const enlaces = (Array.isArray(b.enlaces) ? b.enlaces : []).slice(0, 10).map((u: unknown) => str(u, 500)).filter(Boolean) as string[];
  if (enlaces.some((u) => { try { return !["http:", "https:"].includes(new URL(u).protocol); } catch { return true; } }))
    errores.enlaces = "Usa enlaces que empiecen por http(s)://";

  const fila = {
    user_id: user.id,
    nombre: campo(b, "nombre", 160, true, faltan),
    empresa: campo(b, "empresa", 160),
    responsable: campo(b, "responsable", 160, true, faltan),
    sector: campo(b, "sector", 160),
    descripcion: campo(b, "descripcion", 4000, true, faltan),
    problema: campo(b, "problema", 3000, true, faltan),
    objetivo: campo(b, "objetivo", 1000, true, faltan),
    objetivos_especificos: campo(b, "objetivos_especificos", 3000),
    publico: campo(b, "publico", 1000),
    beneficios: campo(b, "beneficios", 2000),
    funcionalidades: campo(b, "funcionalidades", 4000, true, faltan),
    req_funcionales: campo(b, "req_funcionales", 4000),
    req_no_funcionales: campo(b, "req_no_funcionales", 3000),
    plataformas,
    integraciones: campo(b, "integraciones", 2000),
    restricciones: campo(b, "restricciones", 2000),
    seguridad: campo(b, "seguridad", 2000),
    fecha_inicio_deseada: inicio ?? null,
    fecha_entrega: entrega ?? null,
    prioridad: PRIORIDADES.includes(b.prioridad) ? b.prioridad : "media",
    presupuesto,
    riesgos: campo(b, "riesgos", 3000),
    enlaces,
  };
  for (const k of faltan) errores[k] = "Obligatorio";

  let reunion = null;
  if (b.reunion) {
    const r = validarReunion(b.reunion);
    if ("errores" in r) Object.assign(errores, Object.fromEntries(Object.entries(r.errores).map(([k, v]) => [`reunion.${k}`, v])));
    else reunion = r.data;
  }
  if (Object.keys(errores).length) return json({ error: "Revisa los campos marcados", errores }, 400);

  return guardarConReunion({
    userId: user.id, tabla: "solicitudes_proyecto", fk: "solicitud_id", fila, reunion,
    descripcion: (codigo) => `Envió la solicitud de proyecto ${codigo} («${fila.nombre}»)`,
    accion: "solicitud_proyecto_enviada",
  });
}
