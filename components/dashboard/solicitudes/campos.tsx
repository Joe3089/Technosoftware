"use client";

import { useId } from "react";
import { AlertTriangle, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const cardStyle = { background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" };
const control = "w-full rounded-lg border bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff] placeholder:text-silver/40 focus:outline-none focus:border-blue-accent/60";

export type Errores = Record<string, string>;

/** Labeled control with optional/required marker, hint and inline error. */
export function Campo({ label, error, hint, req, children }: {
  label: string; error?: string; hint?: string; req?: boolean; children: (id: string, invalid: boolean) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}{req ? <span className="text-red-400"> *</span> : <span className="text-silver/40 font-normal normal-case"> (opcional)</span>}</Label>
      {children(id, !!error)}
      {error ? <p className="text-xs text-red-400" role="alert">{error}</p> : hint && <p className="text-xs text-silver/50">{hint}</p>}
    </div>
  );
}

export function Texto({ label, value, onChange, error, req, max = 200, placeholder, hint, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; req?: boolean; max?: number; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <Campo label={label} error={error} req={req} hint={hint}>
      {(id, invalid) => <Input id={id} type={type} value={value} maxLength={max} placeholder={placeholder} aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)} className={cn(invalid && "border-red-400/60")} />}
    </Campo>
  );
}

export function Area({ label, value, onChange, error, req, max = 2000, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; req?: boolean; max?: number; placeholder?: string; rows?: number;
}) {
  return (
    <Campo label={label} error={error} req={req} hint={`${value.length}/${max}`}>
      {(id, invalid) => <textarea id={id} rows={rows} value={value} maxLength={max} placeholder={placeholder} aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)} className={cn(control, "resize-y", invalid ? "border-red-400/60" : "border-glass-bd")} />}
    </Campo>
  );
}

export function Selector({ label, value, onChange, options, error, req }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]; error?: string; req?: boolean;
}) {
  return (
    <Campo label={label} error={error} req={req}>
      {(id, invalid) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid}
          className={cn(control, invalid ? "border-red-400/60" : "border-glass-bd")}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </Campo>
  );
}

export const PRIORIDAD_OPTS: [string, string][] = [["baja", "Baja"], ["media", "Media"], ["alta", "Alta"], ["urgente", "Urgente"]];

export function Seccion({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("rounded-2xl border border-glass-bd p-4 sm:p-6 flex flex-col gap-4", className)} style={cardStyle}>
      <legend className="px-2 text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function Aviso({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", ok ? "border-status-green/40 text-status-green" : "border-red-400/40 text-red-400")} role="alert">
      {!ok && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />} {children}
    </p>
  );
}

/* ── Attachments (validated again on the server) ── */
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx";
const EXT_OK = /\.(pdf|png|jpe?g|webp|docx|xlsx)$/i;
export const MAX_ADJUNTOS = 5;

export function Adjuntos({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const id = useId();
  const malos = files.filter((f) => !EXT_OK.test(f.name) || f.size > 4 * 1024 * 1024);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Archivos adjuntos <span className="text-silver/40 font-normal normal-case">(opcional)</span></Label>
      <label htmlFor={id} className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-glass-bd px-4 py-3 text-sm text-silver hover:text-white hover:border-blue-accent/50 cursor-pointer">
        <Paperclip className="w-4 h-4" /> Seleccionar archivos
      </label>
      <input id={id} type="file" multiple accept={ACCEPT} className="sr-only"
        onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])].slice(0, MAX_ADJUNTOS)); e.target.value = ""; }} />
      <p className="text-xs text-silver/50">PDF, JPG, PNG, WebP, Word o Excel · máx. 4 MB c/u · hasta {MAX_ADJUNTOS} archivos</p>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={i} className={cn("flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs border",
              malos.includes(f) ? "border-red-400/40 text-red-400" : "border-glass-bd text-silver")}>
              <span className="truncate">{f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB{malos.includes(f) && " — no permitido"}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Quitar ${f.name}`}><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const adjuntosValidos = (files: File[]) => files.every((f) => EXT_OK.test(f.name) && f.size <= 4 * 1024 * 1024);

/** Uploads attachments one by one; returns the names that failed (the request itself is already saved). */
export async function subirAdjuntos(tipo: "consultoria" | "solicitud", ref: string, files: File[]) {
  const fallidos: string[] = [];
  for (const f of files) {
    const fd = new FormData();
    fd.append("tipo", tipo); fd.append("ref", ref); fd.append("archivo", f, f.name);
    const r = await fetch("/api/adjuntos", { method: "POST", body: fd }).catch(() => null);
    if (!r?.ok) fallidos.push(f.name);
  }
  return fallidos;
}

/** Splits server errors "reunion.campo" into the meeting sheet's own error map. */
export function separarErrores(e: Errores) {
  const form: Errores = {}, reunion: Errores = {};
  for (const [k, v] of Object.entries(e)) (k.startsWith("reunion.") ? (reunion[k.slice(8)] = v) : (form[k] = v));
  return { form, reunion };
}
