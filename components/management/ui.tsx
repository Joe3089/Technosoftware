"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, type Lista } from "@/components/management/contexto";

export const campoCls =
  "w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff] placeholder:text-silver/40 focus:outline-none focus:border-blue-accent focus:ring-1 focus:ring-blue-accent/40 disabled:opacity-60 [color-scheme:dark]";

export function Etiqueta({ texto, children, className, requerido }: { texto: string; children: React.ReactNode; className?: string; requerido?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-xs font-ui text-silver", className)}>
      <span>{texto}{requerido && <span className="text-red-400"> *</span>}</span>
      {children}
    </label>
  );
}

export function Selector({ value, onChange, opciones, vacio, className, ...rest }: {
  value: string; onChange: (v: string) => void; opciones: { valor: string; etiqueta: string }[]; vacio?: string; className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(campoCls, "pr-8", className)} {...rest}>
      {vacio !== undefined && <option value="" className="bg-[#0b1430]">{vacio}</option>}
      {opciones.map((o) => <option key={o.valor} value={o.valor} className="bg-[#0b1430]">{o.etiqueta}</option>)}
    </select>
  );
}

export function Chip({ texto, color, className }: { texto: string; color?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-ui font-semibold whitespace-nowrap", className)}
      style={{ color: color ?? "#9aafd4", borderColor: `${color ?? "#9aafd4"}55`, background: `${color ?? "#9aafd4"}14` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color ?? "#9aafd4" }} />{texto}
    </span>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-silver"><Loader2 className="w-4 h-4 animate-spin" />{texto}</div>;
}

export function Vacio({ texto, accion }: { texto: string; accion?: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 py-10 text-sm text-silver/70 text-center">{texto}{accion}</div>;
}

export function ErrorCaja({ texto }: { texto: string }) {
  return <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">{texto}</div>;
}

export function Tarjeta({ titulo, accion, children, className }: { titulo?: React.ReactNode; accion?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass-card rounded-xl p-4 sm:p-5", className)}>
      {(titulo || accion) && (
        <header className="flex items-center justify-between gap-3 mb-3">
          {titulo && <h2 className="font-ui font-semibold text-[#f0f4ff] text-sm sm:text-base">{titulo}</h2>}
          {accion}
        </header>
      )}
      {children}
    </section>
  );
}

export function Indicador({ titulo, valor, detalle, color = "#4d7fff", icono: Icono }: { titulo: string; valor: React.ReactNode; detalle?: React.ReactNode; color?: string; icono?: React.ElementType }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-start gap-3">
      {Icono && <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}1f`, color }}><Icono className="w-5 h-5" /></div>}
      <div className="min-w-0">
        <p className="text-xs text-silver">{titulo}</p>
        <p className="text-2xl font-ui font-bold text-[#f0f4ff] tabular-nums" translate="no">{valor}</p>
        {detalle && <p className="text-[11px] text-silver/70 mt-0.5">{detalle}</p>}
      </div>
    </div>
  );
}

export function Buscador({ valor, onCambio, placeholder = "Buscar…", className }: { valor: string; onCambio: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(valor);
  useEffect(() => setLocal(valor), [valor]);
  useEffect(() => { const t = setTimeout(() => local !== valor && onCambio(local), 300); return () => clearTimeout(t); }, [local, valor, onCambio]);
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver/50" aria-hidden />
      <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn(campoCls, "pl-9")} />
    </div>
  );
}

export function Paginacion({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / size));
  if (total <= size) return <p className="text-xs text-silver/60 mt-3" translate="no">{total} registro(s)</p>;
  return (
    <div className="flex items-center justify-between gap-2 mt-3 text-xs text-silver">
      <span translate="no">{(page - 1) * size + 1}–{Math.min(page * size, total)} de {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior"><ChevronLeft className="w-4 h-4" /></Button>
        <span className="px-2" translate="no">{page}/{paginas}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= paginas} onClick={() => onPage(page + 1)} aria-label="Siguiente"><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

export function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = "max-w-2xl" }: {
  abierto: boolean; onCerrar: () => void; titulo: string; descripcion?: string; children: React.ReactNode; ancho?: string;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className={cn("w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto", ancho)}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion ? <DialogDescription>{descripcion}</DialogDescription> : <DialogDescription className="sr-only">{titulo}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Confirmación para acciones críticas. Si `palabra` se indica, hay que escribirla para habilitar el botón. */
export function Confirmar({ abierto, titulo, texto, palabra, accion = "Confirmar", peligro = true, onCerrar, onConfirmar }: {
  abierto: boolean; titulo: string; texto: React.ReactNode; palabra?: string; accion?: string; peligro?: boolean;
  onCerrar: () => void; onConfirmar: (escrito: string) => Promise<unknown> | void;
}) {
  const [escrito, setEscrito] = useState("");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (abierto) setEscrito(""); }, [abierto]);
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo} ancho="max-w-md">
      <div className="space-y-4 text-sm text-silver">
        <div>{texto}</div>
        {palabra && (
          <Etiqueta texto={`Escribe «${palabra}» para confirmar`}>
            <input className={campoCls} value={escrito} onChange={(e) => setEscrito(e.target.value)} autoFocus translate="no" />
          </Etiqueta>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCerrar}>Cancelar</Button>
          <Button variant={peligro ? "destructive" : "default"} size="sm" disabled={ocupado || (!!palabra && escrito.trim().toLowerCase() !== palabra.toLowerCase())}
            onClick={async () => { setOcupado(true); try { await onConfirmar(escrito); } finally { setOcupado(false); } }}>
            {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{accion}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type FilaRef = Record<string, unknown> & { id: string };
/** Selector con búsqueda sobre un recurso (relaciones). Muestra solo lo que RLS deja ver. */
export function SelectorRef({ recurso, value, onChange, etiqueta, inicial, filtros, placeholder = "Sin asignar", disabled }: {
  recurso: string; value: string | null; onChange: (id: string | null, fila?: FilaRef) => void;
  etiqueta: (f: FilaRef) => string; inicial?: string | null; filtros?: Record<string, string>; placeholder?: string; disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<FilaRef[]>([]);
  const [texto, setTexto] = useState(inicial ?? "");
  const [cargando, setCargando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const filtrosQs = JSON.stringify(filtros ?? {});

  useEffect(() => { setTexto(inicial ?? ""); }, [inicial]);
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => {
      setCargando(true);
      const f = Object.fromEntries(Object.entries(JSON.parse(filtrosQs)).map(([k, v]) => [`f.${k}`, v as string]));
      api<Lista<FilaRef>>(`/api/gestion/${recurso}?${new URLSearchParams({ q, size: "20", ...f })}`)
        .then((r) => setOpciones(r.datos)).catch(() => setOpciones([])).finally(() => setCargando(false));
    }, 200);
    return () => clearTimeout(t);
  }, [abierto, q, recurso, filtrosQs]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <div className="flex gap-1">
        <button type="button" disabled={disabled} onClick={() => setAbierto((a) => !a)}
          className={cn(campoCls, "text-left truncate", !value && "text-silver/50")} aria-haspopup="listbox" aria-expanded={abierto}>
          {value ? texto || "Seleccionado" : placeholder}
        </button>
        {value && !disabled && (
          <button type="button" onClick={() => { onChange(null); setTexto(""); }} className="px-2 text-silver hover:text-white" aria-label="Quitar selección"><X className="w-4 h-4" /></button>
        )}
      </div>
      {abierto && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-glass-bd bg-[#0b1430] shadow-glass">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={cn(campoCls, "rounded-b-none border-0 border-b")} />
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1 text-sm">
            {cargando && <li className="px-3 py-2 text-silver/60">Buscando…</li>}
            {!cargando && !opciones.length && <li className="px-3 py-2 text-silver/60">Sin resultados</li>}
            {!cargando && opciones.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button type="button" className={cn("w-full text-left px-3 py-1.5 hover:bg-blue-accent/15 truncate", o.id === value && "text-cyan")}
                  onClick={() => { onChange(o.id, o); setTexto(etiqueta(o)); setAbierto(false); }}>{etiqueta(o)}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const fmtFecha = (v: string | null | undefined) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtFechaHora = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtMonto = (v: number | string | null | undefined, moneda = "USD") =>
  v == null || v === "" ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(Number(v));
export const hoy = () => new Date().toISOString().slice(0, 10);
