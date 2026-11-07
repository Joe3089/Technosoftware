"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, RotateCcw, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ESTADO_LABEL, TIPOS_OBSERVACION, type Observacion, type ProyectoDetalle } from "@/lib/proyectos";
import { cn } from "@/lib/utils";

export const cardStyle = { background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" };

const fechaFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
const fechaHoraFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });
export const fecha = (v: string | null) => (v ? fechaFmt.format(new Date(v)) : "No disponible");
export const fechaHora = (v: string) => fechaHoraFmt.format(new Date(v));

export function EstadoBadge({ estado }: { estado: string }) {
  const variant = estado === "completado" ? "green" : estado === "cancelado" ? "silver" : estado === "pendiente" ? "cyan" : "default";
  return <Badge variant={variant}>{ESTADO_LABEL[estado] ?? estado}</Badge>;
}

export function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-silver/60">{label}</p>
      <p className="text-sm font-ui text-[#f0f4ff] truncate">{children}</p>
    </div>
  );
}

export function PanelShell({ title, subtitle, actions, children }: {
  title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">{title}</h2>
          <p className="text-sm text-silver mt-1">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </motion.div>
  );
}

export function Estado({ loading, error, vacio, onRetry, mensajeVacio }: {
  loading: boolean; error: string; vacio: boolean; onRetry: () => void; mensajeVacio: string;
}) {
  if (error) return (
    <div className="rounded-2xl border border-glass-bd p-8 flex flex-col items-center gap-3 text-center" style={cardStyle}>
      <p className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" /> {error}</p>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5">
        <RotateCcw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-blue-accent animate-spin" /></div>;
  if (vacio) return (
    <div className="rounded-2xl border border-glass-bd p-8 text-center text-sm text-silver/70" style={cardStyle}>{mensajeVacio}</div>
  );
  return null;
}

/** Paginated project list for a group, accumulating pages ("Cargar más"). */
export function useProyectos(grupo: string | null, q = "") {
  const [items, setItems] = useState<ProyectoDetalle[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState(0);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (p: number) => {
    setLoading(true); setError("");
    const sp = new URLSearchParams({ pagina: String(p) });
    if (grupo) sp.set("grupo", grupo);
    if (q) sp.set("q", q);
    try {
      const r = await fetch(`/api/proyectos?${sp}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudieron cargar los proyectos");
      setItems((prev) => (p === 0 ? j.proyectos : [...prev, ...j.proyectos]));
      setPagina(p); setHayMas(j.hayMas); setTotal(j.total); setConteos(j.conteos);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [grupo, q]);

  useEffect(() => { cargar(0); }, [cargar]);

  return {
    items, total, conteos, hayMas, loading, error,
    masUno: () => cargar(pagina + 1),
    recargar: () => cargar(0),
  };
}

/** Lazily loaded, read-only list of a project's observations. */
export function Observaciones({ proyectoId, version = 0, soloCierre = false }: { proyectoId: string; version?: number; soloCierre?: boolean }) {
  const [obs, setObs] = useState<Observacion[] | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setError(""); setObs(null);
    fetch(`/api/proyectos/${proyectoId}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j.observaciones; })
      .then(setObs)
      .catch((e) => setError(e.message || "No se pudieron cargar las observaciones"));
  }, [proyectoId]);

  useEffect(() => { cargar(); }, [cargar, version]);

  if (error) return (
    <p className="flex items-center gap-2 text-xs text-red-400 mt-3">
      <AlertTriangle className="w-3.5 h-3.5" /> {error}
      <button onClick={cargar} className="underline">Reintentar</button>
    </p>
  );
  if (!obs) return <Loader2 className="w-4 h-4 mt-3 text-blue-accent animate-spin" />;
  const lista = soloCierre ? obs.filter((o) => o.tipo === "cierre") : obs;
  if (!lista.length) return <p className="mt-3 text-xs text-silver/60">{soloCierre ? "Sin resumen de cierre registrado." : "Este proyecto aún no tiene observaciones."}</p>;

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {lista.map((o) => (
        <li key={o.id} className="rounded-lg border border-glass-bd/60 p-3 bg-blue-accent/5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <MessageSquare className="w-3.5 h-3.5 text-blue-accent" />
            <span className={cn("font-ui font-semibold", o.tipo === "bloqueo" || o.tipo === "incidencia" ? "text-red-400" : "text-blue-accent")}>
              {TIPOS_OBSERVACION[o.tipo] ?? o.tipo}
            </span>
            <span className="text-silver/60">· {fechaHora(o.created_at)}{o.autor && ` · ${o.autor.full_name || o.autor.email}`}</span>
          </div>
          <p className="mt-1 text-sm text-[#f0f4ff] whitespace-pre-line">{o.texto}</p>
        </li>
      ))}
    </ul>
  );
}

export function CargarMas({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <button onClick={onClick} className="w-full py-2.5 rounded-xl border border-blue-accent/30 text-sm font-ui text-blue-accent hover:bg-blue-accent/10 transition-colors">
      Cargar más
    </button>
  );
}
