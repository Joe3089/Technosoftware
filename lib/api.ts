import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Resolves the session; returns an error response if not signed in / not admin. */
export async function requireRole(role: "user" | "admin") {
  const session = await getSessionProfile();
  if (!session) return { error: json({ error: "No autenticado" }, 401) } as const;
  if (role === "admin" && session.role !== "admin")
    return { error: json({ error: "Requiere rol de administrador" }, 403) } as const;
  return { session } as const;
}

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

export const str = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
