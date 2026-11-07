"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ESTADOS_ACTIVOS, ESTADO_LABEL, FASES, TIPOS_OBSERVACION, type ProyectoDetalle } from "@/lib/proyectos";
import { cn } from "@/lib/utils";
import { PanelShell, useProyectos, Estado, EstadoBadge, Dato, CargarMas, Observaciones, cardStyle, fecha, fechaHora } from "./comun";

function Fases({ fase }: { fase: string | null }) {
  if (!fase) return <p className="text-xs text-silver/60">Fase no registrada</p>;
  const actual = FASES.findIndex((f) => f.id === fase);
  return (
    <ol className="flex items-center gap-1" aria-label="Fases de desarrollo">
      {FASES.map((f, i) => (
        <li key={f.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className={cn("w-full h-1.5 rounded-full", i < actual ? "bg-status-green" : i === actual ? "bg-blue-accent" : "bg-navy-mid")} />
          <span className={cn("text-[11px] font-ui truncate max-w-full", i === actual ? "text-[#f0f4ff] font-semibold" : "text-silver/60")}
            aria-current={i === actual ? "step" : undefined}>
            {f.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

const sel = "w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff]";

/** Admin-only editor: updates go through the admin API (role checked on the server). */
function EditorAdmin({ p, onSaved }: { p: ProyectoDetalle; onSaved: () => void }) {
  const [estado, setEstado] = useState(p.estado);
  const [fase, setFase] = useState(p.fase ?? "");
  const [avance, setAvance] = useState(p.avance?.toString() ?? "");
  const [responsable, setResponsable] = useState(p.responsable ?? "");
  const [tipo, setTipo] = useState("avance");
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function send(url: string, method: string, body: unknown) {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo guardar");
  }

  async function guardar() {
    setBusy(true); setMsg(null);
    try {
      await send(`/api/proyectos/${p.id}`, "PATCH", {
        ...(estado !== p.estado && { estado }),
        fase: fase || null,
        avance: avance === "" ? null : Number(avance),
        responsable: responsable || null,
      });
      if (texto.trim()) await send(`/api/proyectos/${p.id}/observaciones`, "POST", { tipo, texto });
      setTexto("");
      setMsg({ ok: true, t: "Cambios guardados." });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-blue-accent/20 p-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="text-xs text-silver/70">Estado
          <select className={sel} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {[...ESTADOS_ACTIVOS, "completado", "cancelado"].map((s) => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="text-xs text-silver/70">Fase
          <select className={sel} value={fase} onChange={(e) => setFase(e.target.value)}>
            <option value="">Sin registrar</option>
            {FASES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-silver/70">Avance %
          <input className={sel} type="number" min={0} max={100} step={1} value={avance} onChange={(e) => setAvance(e.target.value)} placeholder="—" />
        </label>
        <label className="text-xs text-silver/70">Responsable
          <input className={sel} value={responsable} onChange={(e) => setResponsable(e.target.value)} maxLength={120} />
        </label>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select className={cn(sel, "sm:w-40")} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de observación">
          {Object.entries(TIPOS_OBSERVACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={sel} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} placeholder="Nueva observación (opcional)" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={guardar} disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-cta text-sm font-ui text-white disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
        </button>
        {msg && <span className={cn("text-xs", msg.ok ? "text-status-green" : "text-red-400")}>{msg.t}</span>}
      </div>
    </div>
  );
}

export default function EstatusProyectosPanel() {
  const { isAdmin } = useAuth(false);
  const { items, hayMas, loading, error, masUno, recargar } = useProyectos("activos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  return (
    <PanelShell title="Estatus de Proyectos" subtitle="Avance de tus proyectos activos, fase actual y observaciones.">
      {items.map((p) => {
        const open = abierto === p.id;
        return (
          <div key={p.id} className="rounded-2xl border border-glass-bd p-4 sm:p-5 flex flex-col gap-4" style={cardStyle}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-ui font-semibold text-[#f0f4ff]">{p.nombre}</p>
              <EstadoBadge estado={p.estado} />
            </div>

            <Fases fase={p.fase} />

            {p.avance !== null && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-ui"><span className="text-silver/70">Avance</span><span className="text-blue-accent font-semibold">{p.avance}%</span></div>
                <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-accent to-cyan" style={{ width: `${p.avance}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Dato label="Inicio">{fecha(p.fecha_inicio)}</Dato>
              <Dato label="Última actualización">{fechaHora(p.updated_at)}</Dato>
              <Dato label="Responsable">{p.responsable || "Sin asignar"}</Dato>
              {p.cliente && <Dato label="Cliente">{p.cliente.full_name || p.cliente.email}</Dato>}
            </div>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => setAbierto(open ? null : p.id)} className="flex items-center gap-1 text-xs font-ui text-blue-accent">
                Observaciones <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
              </button>
              {isAdmin && (
                <button onClick={() => setEditando(editando === p.id ? null : p.id)} className="flex items-center gap-1 text-xs font-ui text-silver hover:text-white">
                  <Settings2 className="w-3.5 h-3.5" /> Actualizar
                </button>
              )}
            </div>
            {isAdmin && editando === p.id && (
              <EditorAdmin p={p} onSaved={() => { setVersion((v) => v + 1); setAbierto(p.id); recargar(); }} />
            )}
            {open && <Observaciones proyectoId={p.id} version={version} />}
          </div>
        );
      })}

      <Estado loading={loading} error={error} vacio={!items.length} onRetry={recargar}
        mensajeVacio="No tienes proyectos activos en este momento." />
      <CargarMas visible={hayMas && !loading && !error} onClick={masUno} />
    </PanelShell>
  );
}
