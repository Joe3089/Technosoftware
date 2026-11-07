"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, Loader2, FileText, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import LogoMetodo from "@/components/pagos/LogoMetodo";
import { CAMPOS_METODO, type Metodo } from "@/lib/pagos";
import { cn } from "@/lib/utils";
import { PanelShell, Estado, cardStyle } from "../proyectos/comun";
import ConciliacionIA, { RegistroCompleto } from "./ConciliacionIA";
import type { Conciliacion } from "@/lib/conciliacion";

interface Pendiente {
  id: string; monto: string; estado: string; detalle: string | null; metodo: string; referencia: string; fecha_pago: string;
  monto_origen: string | null; moneda_origen: string | null; created_at: string; tieneComprobante: boolean;
  cliente: { email: string; full_name: string | null } | null; metodo_info: { nombre: string } | null;
  conciliacion: Conciliacion | null;
}

function Verificacion() {
  const [estado, setEstado] = useState("pendiente");
  const [items, setItems] = useState<Pendiente[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(() => {
    setError(""); setItems(null);
    fetch(`/api/admin/recargas?estado=${estado}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setItems(j.recargas); })
      .catch((e) => setError(e.message || "Error al cargar"));
  }, [estado]);
  useEffect(cargar, [cargar]);

  async function resolver(id: string, accion: "aprobar" | "rechazar") {
    const motivo = accion === "rechazar" ? window.prompt("Motivo del rechazo (lo verá el cliente):") : null;
    if (accion === "rechazar" && motivo === null) return;
    if (accion === "aprobar" && !window.confirm("¿Confirmas que el pago llegó a la cuenta receptora? Se acreditará el saldo.")) return;
    setBusy(id); setMsg("");
    const r = await fetch(`/api/admin/recargas/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, motivo }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    setMsg(r.ok ? (accion === "aprobar" ? "Pago aprobado y saldo acreditado." : "Pago rechazado.") : j.error ?? "Error");
    cargar();
  }

  const f = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[["pendiente", "Por verificar"], ["aprobado", "Aprobadas"], ["rechazado", "Rechazadas"]].map(([k, l]) => (
          <button key={k} onClick={() => setEstado(k)} className={cn("px-3 py-1.5 rounded-full text-xs font-ui border",
            estado === k ? "border-blue-accent/60 bg-blue-accent/20 text-[#f0f4ff]" : "border-glass-bd text-silver hover:text-white")}>{l}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-status-green">{msg}</p>}
      {items?.map((r) => (
        <div key={r.id} className="rounded-2xl border border-glass-bd p-4 flex flex-wrap items-center gap-4" style={cardStyle}>
          <LogoMetodo id={r.metodo as Metodo["id"]} nombre={r.metodo_info?.nombre ?? r.metodo} size="sm" />
          <div className="flex-1 min-w-[200px] text-sm">
            <p className="text-[#f0f4ff] font-ui font-semibold">{Number(r.monto).toFixed(2)} USD
              {r.monto_origen && <span className="text-silver font-normal"> · pagó {Number(r.monto_origen).toLocaleString("es")} {r.moneda_origen}</span>}</p>
            <p className="text-xs text-silver">{r.cliente?.full_name || r.cliente?.email} · Ref. <span className="font-mono text-cyan">{r.referencia}</span> · pago del {r.fecha_pago}</p>
            <p className="text-xs text-silver/60">Reportado {f.format(new Date(r.created_at))}{r.detalle && estado !== "pendiente" ? ` · ${r.detalle}` : ""}</p>
          </div>
          {r.tieneComprobante && (
            <a href={`/api/admin/recargas/${r.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-accent underline">
              <FileText className="w-3.5 h-3.5" /> Comprobante
            </a>
          )}
          {estado === "pendiente" && (
            <div className="flex gap-2">
              <button onClick={() => resolver(r.id, "aprobar")} disabled={busy === r.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-green/15 border border-status-green/40 text-xs font-ui text-status-green">
                {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
              </button>
              <button onClick={() => resolver(r.id, "rechazar")} disabled={busy === r.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-400/40 text-xs font-ui text-red-400">
                <X className="w-3.5 h-3.5" /> Rechazar
              </button>
            </div>
          )}
          {r.estado === "pendiente" && <div className="w-full"><RegistroCompleto r={r} /></div>}
          {r.estado === "aprobado" && <ConciliacionIA id={r.id} inicial={r.conciliacion} />}
        </div>
      ))}
      <Estado loading={!items && !error} error={error} vacio={!!items && !items.length} onRetry={cargar} mensajeVacio="No hay pagos en este estado." />
    </div>
  );
}

function ConfigMetodo({ m, onSaved }: { m: Metodo; onSaved: () => void }) {
  const [datos, setDatos] = useState<Record<string, string>>(m.datos ?? {});
  const [instr, setInstr] = useState(m.instrucciones ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  // Fields stay locked until the admin explicitly chooses to edit (e.g. the company changes bank details).
  const [editando, setEditando] = useState(false);

  function cancelar() {
    setDatos(m.datos ?? {}); setInstr(m.instrucciones ?? ""); setEditando(false); setMsg(null);
  }

  async function guardar(activo?: boolean) {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/metodos-pago/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datos, instrucciones: instr, ...(activo !== undefined && { activo }) }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, t: "Guardado." } : { ok: false, t: j.error ?? "Error" });
    if (r.ok) { setEditando(false); onSaved(); }
  }

  return (
    <div className="rounded-2xl border border-glass-bd p-4 sm:p-5 flex flex-col gap-3" style={cardStyle}>
      <div className="flex flex-wrap items-center gap-3">
        <LogoMetodo id={m.id} nombre={m.nombre} size="sm" />
        <p className="flex-1 font-ui font-semibold text-[#f0f4ff]">{m.nombre} <span className="text-xs text-silver font-normal">· {m.moneda} · {m.tipo === "automatico" ? "API" : "verificación manual"}</span></p>
        {m.tipo === "manual" && !editando && (
          <button onClick={() => { setEditando(true); setMsg(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-accent/50 text-xs font-ui text-[#f0f4ff] hover:bg-blue-accent/15">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
        <span className={cn("text-xs", m.disponible ? "text-status-green" : "text-silver/60")}>{m.disponible ? "Visible para clientes" : m.activo ? "Activo, falta configuración" : "Inactivo"}</span>
        <button onClick={() => guardar(!m.activo)} disabled={busy}
          className={cn("px-3 py-1.5 rounded-lg border text-xs font-ui", m.activo ? "border-red-400/40 text-red-400" : "border-status-green/40 text-status-green")}>
          {m.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
      {m.tipo === "automatico" ? (
        <p className="text-xs text-silver/70">Se configura con variables de entorno del servidor (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID).</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAMPOS_METODO[m.id].map(([k, label, req]) => (
              <label key={k} className="text-xs text-silver/70 flex flex-col gap-1">{label}{req && " *"}
                <Input value={datos[k] ?? ""} maxLength={160} readOnly={!editando} className={cn(!editando && "opacity-70 cursor-default")} onChange={(e) => setDatos((d) => ({ ...d, [k]: e.target.value }))} />
              </label>
            ))}
          </div>
          <label className="text-xs text-silver/70 flex flex-col gap-1">Instrucciones para el cliente (tasa, horario de verificación…)
            <textarea rows={2} maxLength={1000} value={instr} onChange={(e) => setInstr(e.target.value)} readOnly={!editando}
              className={cn("rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff]", !editando && "opacity-70 cursor-default")} />
          </label>
        </>
      )}
      <div className="flex items-center gap-3">
        {m.tipo === "manual" && editando && (
          <>
            <button onClick={() => guardar()} disabled={busy} className="px-4 py-2 rounded-lg bg-gradient-cta text-xs font-ui text-white disabled:opacity-60">
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
            <button onClick={cancelar} disabled={busy} className="px-4 py-2 rounded-lg border border-glass-bd text-xs font-ui text-silver hover:text-white">
              Cancelar
            </button>
          </>
        )}
        {msg && <span className={cn("text-xs", msg.ok ? "text-status-green" : "text-red-400")}>{msg.t}</span>}
      </div>
    </div>
  );
}

export default function PagosAdminPanel() {
  const [tab, setTab] = useState<"verificar" | "metodos">("verificar");
  const [metodos, setMetodos] = useState<Metodo[] | null>(null);
  const [error, setError] = useState("");
  const cargarMetodos = useCallback(() => {
    fetch("/api/metodos-pago").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setMetodos(j.metodos); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(cargarMetodos, [cargarMetodos]);

  return (
    <PanelShell title="Pagos" subtitle="Verifica los pagos reportados y configura las cuentas receptoras de la pasarela.">
      <div className="flex gap-2">
        {([["verificar", "Pagos por verificar"], ["metodos", "Métodos de pago"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("px-3 py-1.5 rounded-full text-xs font-ui border",
            tab === k ? "border-blue-accent/60 bg-blue-accent/20 text-[#f0f4ff]" : "border-glass-bd text-silver hover:text-white")}>{l}</button>
        ))}
      </div>
      {tab === "verificar" ? <Verificacion /> : (
        <div className="flex flex-col gap-3">
          {metodos?.map((m) => <ConfigMetodo key={m.id + m.activo + JSON.stringify(m.datos)} m={m} onSaved={cargarMetodos} />)}
          <Estado loading={!metodos && !error} error={error} vacio={false} onRetry={cargarMetodos} mensajeVacio="" />
        </div>
      )}
    </PanelShell>
  );
}
