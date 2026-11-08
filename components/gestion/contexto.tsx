"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

// ── API ──────────────────────────────────────────────────────────────
export class ErrorApi extends Error {}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json: cuerpo, ...resto } = init ?? {};
  const res = await fetch(url, {
    ...resto,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json", ...resto.headers } : resto.headers,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : resto.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(data.error ?? "No se pudo completar la operación");
  return data as T;
}

export type Lista<T> = { datos: T[]; total: number; page: number; size: number };
export function qs(p: Record<string, string | number | boolean | null | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  return s.toString();
}
export const listar = <T,>(recurso: string, p: Record<string, string | number | boolean | null | undefined> = {}) =>
  api<Lista<T>>(`/api/gestion/${recurso}?${qs(p)}`);

// ── Contexto de sesión ───────────────────────────────────────────────
export interface Sesion {
  staff: boolean; rol: "admin" | "coordinador" | "supervisor" | "empleado";
  empleado_id: string | null; permisos: string[]; departamentos: string[];
  email: string; nombre: string; notificaciones: number;
  empleado: { id: string; nombre: string; apellido: string; departamento_id: string | null; cargo: { nombre: string } | null } | null;
}
type Aviso = { id: number; tipo: "ok" | "error"; texto: string };

interface Valor {
  sesion: Sesion | null;
  puede: (permiso: string) => boolean;
  esAdmin: boolean;
  recargar: () => void;
  avisar: (texto: string, tipo?: Aviso["tipo"]) => void;
  /** Ejecuta una acción mostrando el error como aviso; devuelve null si falló. */
  intentar: <T>(fn: () => Promise<T>, ok?: string) => Promise<T | null>;
}

const Ctx = createContext<Valor | null>(null);

export function ProveedorGestion({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const n = useRef(0);

  const recargar = useCallback(() => {
    api<Sesion>("/api/gestion/contexto").then(setSesion).catch(() => setSesion(null));
  }, []);
  useEffect(recargar, [recargar]);

  const avisar = useCallback((texto: string, tipo: Aviso["tipo"] = "ok") => {
    const id = ++n.current;
    setAvisos((a) => [...a.slice(-3), { id, tipo, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "error" ? 6000 : 3000);
  }, []);

  const intentar = useCallback(async <T,>(fn: () => Promise<T>, ok?: string) => {
    try { const r = await fn(); if (ok) avisar(ok); return r; }
    catch (e) { avisar(e instanceof Error ? e.message : "Error inesperado", "error"); return null; }
  }, [avisar]);

  const valor = useMemo<Valor>(() => ({
    sesion, recargar, avisar, intentar,
    esAdmin: sesion?.rol === "admin",
    puede: (p) => !!sesion && (sesion.rol === "admin" || sesion.permisos.includes(p)),
  }), [sesion, recargar, avisar, intentar]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-glass backdrop-blur ${a.tipo === "ok" ? "border-status-green/40 bg-[#0b2a1f]/90 text-[#c8ffe4]" : "border-red-500/40 bg-[#2a0b12]/90 text-red-200"}`}>
            {a.tipo === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="flex-1">{a.texto}</span>
            <button onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))} aria-label="Cerrar"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useGestion() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGestion fuera de ProveedorGestion");
  return v;
}

/** Carga una lista de un recurso y la recarga cuando cambian los parámetros. */
export function useLista<T>(recurso: string | null, params: Record<string, string | number | boolean | null | undefined>) {
  const [estado, setEstado] = useState<{ datos: T[]; total: number; cargando: boolean; error: string | null }>({ datos: [], total: 0, cargando: true, error: null });
  const clave = recurso ? `${recurso}?${qs(params)}` : null;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api<Lista<T>>(`/api/gestion/${clave}`)
      .then((r) => vivo && setEstado({ datos: r.datos, total: r.total, cargando: false, error: null }))
      .catch((e) => vivo && setEstado({ datos: [], total: 0, cargando: false, error: e.message }));
    return () => { vivo = false; };
  }, [clave, tick]);
  const recargar = useCallback(() => setTick((t) => t + 1), []);
  const setDatos = useCallback((f: (d: T[]) => T[]) => setEstado((e) => ({ ...e, datos: f(e.datos) })), []);
  return { ...estado, recargar, setDatos };
}
