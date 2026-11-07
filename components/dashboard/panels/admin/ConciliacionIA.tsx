"use client";

import { useState } from "react";
import { Bot, CheckCircle2, ChevronDown, ClipboardCheck, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conciliacion } from "@/lib/conciliacion";

interface Registro { referencia: string | null; fecha_pago: string | null; monto_origen: string | null; moneda_origen: string | null; tieneComprobante: boolean }

/** Pending payment: is the client's registration complete? (the admin still verifies the money arrived) */
export function RegistroCompleto({ r }: { r: Registro }) {
  const faltan = [
    !r.referencia && "referencia",
    !r.fecha_pago && "fecha de pago",
    r.moneda_origen && r.moneda_origen !== "USD" && !r.monto_origen && "monto pagado",
    !r.tieneComprobante && "comprobante",
  ].filter(Boolean) as string[];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", faltan.length ? "text-amber-300" : "text-status-green")}>
      <ClipboardCheck className="w-3.5 h-3.5" />
      {faltan.length ? `Registro incompleto: falta ${faltan.join(", ")}` : "Registro completo · pendiente de tu verificación"}
    </span>
  );
}

/** Approved payment: AI reconciliation against the wallet ledger. */
export default function ConciliacionIA({ id, inicial }: { id: string; inicial: Conciliacion | null }) {
  const [c, setC] = useState(inicial);
  const [abierto, setAbierto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function conciliar() {
    setBusy(true); setError("");
    const r = await fetch(`/api/admin/recargas/${id}/conciliar`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setC(j.conciliacion); setAbierto(true); } else setError(j.error ?? "No se pudo conciliar");
  }

  const boton = (
    <button onClick={conciliar} disabled={busy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-accent/40 text-xs font-ui text-[#f0f4ff] hover:bg-blue-accent/15 disabled:opacity-60">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c ? <RotateCcw className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      {busy ? "Conciliando…" : c ? "Volver a conciliar" : "Conciliar"}
    </button>
  );

  if (!c) return <div className="w-full flex flex-wrap items-center gap-2">{boton}<span className="text-xs text-silver/60">Aún sin conciliar.</span>{error && <span className="text-xs text-red-400">{error}</span>}</div>;

  const ok = c.estado === "conciliado";
  return (
    <div className="w-full rounded-xl border border-glass-bd p-3 flex flex-col gap-2" translate="no">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-ui font-semibold",
          ok ? "border-status-green/50 bg-status-green/10 text-status-green" : "border-amber-400/50 bg-amber-400/10 text-amber-300")}>
          {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
          {ok ? "Conciliado" : "Conciliado con diferencias"}
        </span>
        <button onClick={() => setAbierto((x) => !x)} className="flex items-center gap-1 text-xs text-silver hover:text-white">
          {abierto ? "Ocultar detalle" : "Ver detalle"} <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", abierto && "rotate-180")} />
        </button>
        <span className="ml-auto">{boton}</span>
      </div>
      <p className="text-xs text-silver"><Bot className="inline w-3.5 h-3.5 mr-1 text-cyan" />{c.nota}</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {abierto && (
        <ul className="flex flex-col gap-1">
          {c.controles.map((x) => (
            <li key={x.id} className="flex items-start gap-2 text-xs">
              <span className={cn("mt-0.5 w-4 shrink-0 text-center font-bold", x.ok === true ? "text-status-green" : x.ok === false ? "text-red-400" : "text-silver/50")}>
                {x.ok === true ? "✓" : x.ok === false ? "✗" : "•"}
              </span>
              <span className="text-silver break-words">{x.detalle}</span>
            </li>
          ))}
          <li className="text-[11px] text-silver/50 pt-1">Conciliado el {new Date(c.at).toLocaleString("es")}</li>
        </ul>
      )}
    </div>
  );
}
