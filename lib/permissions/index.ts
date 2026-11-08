import { json } from "@/lib/api";
import { getSessionProfile } from "@/lib/supabase/server";

export type RolGestion = "admin" | "admin_general" | "comercializacion" | "finanzas" | "talento" | "devops" | "consultoria" | "legal";
export interface ContextoGestion {
  staff: boolean;
  rol: RolGestion | null;
  coordinador: boolean;
  empleado_id: string | null;
  permisos: string[];
  departamentos: string[];
}

/** Sesión del equipo interno. Rol y permisos salen de la base (gestion_contexto), nunca del cliente. */
export async function obtenerContexto() {
  const session = await getSessionProfile();
  if (!session) return null;
  const { data, error } = await session.supabase.rpc("gestion_contexto");
  if (error || !data) return { session, ctx: null };
  return { session, ctx: data as ContextoGestion };
}

export async function requireStaff(opts: { permiso?: string; admin?: boolean } = {}) {
  const r = await obtenerContexto();
  if (!r) return { error: json({ error: "No autenticado" }, 401) } as const;
  const { session, ctx } = r;
  if (!ctx?.staff) return { error: json({ error: "Acceso exclusivo del equipo interno" }, 403) } as const;
  if (opts.admin && ctx.rol !== "admin") return { error: json({ error: "Requiere al administrador principal" }, 403) } as const;
  if (opts.permiso && !ctx.permisos.includes(opts.permiso))
    return { error: json({ error: "No tienes permiso para esta acción" }, 403) } as const;
  return { session, ctx, db: session.supabase } as const;
}

export const esUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Sustituto de requireRole("admin") para flujos delegados a un área: admin o personal con el permiso. */
export async function requireAcceso(permiso: string) {
  const r = await requireStaff({ permiso });
  if ("error" in r) return { error: r.error } as const;
  return { session: r.session, ctx: r.ctx } as const;
}
