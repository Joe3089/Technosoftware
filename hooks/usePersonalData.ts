import { useState, useCallback, useEffect } from "react";

export interface PersonalData {
  nombre: string;
  apellido: string;
  cedula: string;
  dirHab: string;
  dirEmp: string;
  telHab: string;
  telEmp: string;
  telMov: string;
  empresa: string;
  cargo: string;
  profesion: string;
  correo: string;
}

const EMPTY: PersonalData = {
  nombre: "", apellido: "", cedula: "",
  dirHab: "", dirEmp: "",
  telHab: "", telEmp: "", telMov: "",
  empresa: "", cargo: "", profesion: "", correo: "",
};

export function isProfileComplete(d: PersonalData) {
  return !!(d.nombre && d.apellido && d.cedula && d.correo);
}

export function completionPercent(d: PersonalData): number {
  const fields: (keyof PersonalData)[] = [
    "nombre", "apellido", "cedula", "dirHab", "dirEmp",
    "telHab", "telEmp", "telMov", "empresa", "cargo", "profesion", "correo",
  ];
  const filled = fields.filter((k) => !!d[k]).length;
  return Math.round((filled / fields.length) * 100);
}

/* ── Shared store: one request for every component that uses the hook ── */
interface Perfil { data: PersonalData; avatar: string | null }
let cache: Perfil | null = null;
let pending: Promise<Perfil> | null = null;
const listeners = new Set<(p: Perfil) => void>();

function publish(p: Perfil) {
  cache = p;
  listeners.forEach((l) => l(p));
}

function fetchPerfil(): Promise<Perfil> {
  pending ??= fetch("/api/perfil")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => ({ data: { ...EMPTY, ...j.datos }, avatar: j.avatarUrl ?? null }))
    .catch(() => ({ data: { ...EMPTY }, avatar: null }))
    .then((p) => { publish(p); pending = null; return p; });
  return pending;
}

/** Forget the cached profile (call on logout so another account never sees it). */
export function clearPersonalData() {
  cache = null;
  pending = null;
}

async function errorOf(r: Response) {
  return (await r.json().catch(() => ({}))).error ?? "No se pudo guardar. Intenta de nuevo.";
}

export function usePersonalData() {
  const [perfil, setPerfil] = useState<Perfil>(cache ?? { data: { ...EMPTY }, avatar: null });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setPerfil);
    if (!cache) fetchPerfil().finally(() => setLoading(false));
    return () => { listeners.delete(setPerfil); };
  }, []);

  /** Persists personal data on the server. Throws with a readable message on failure. */
  const save = useCallback(async (next: PersonalData) => {
    const r = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!r.ok) throw new Error(await errorOf(r));
    const j = await r.json();
    publish({ data: { ...EMPTY, ...j.datos }, avatar: cache?.avatar ?? null });
  }, []);

  /** Uploads a new profile photo (validated again on the server). */
  const saveAvatar = useCallback(async (foto: Blob) => {
    const form = new FormData();
    form.append("foto", foto, "avatar");
    const r = await fetch("/api/perfil/avatar", { method: "POST", body: form });
    if (!r.ok) throw new Error(await errorOf(r));
    const j = await r.json();
    publish({ data: cache?.data ?? { ...EMPTY }, avatar: j.avatarUrl });
  }, []);

  return { data: perfil.data, avatar: perfil.avatar, loading, save, saveAvatar };
}
