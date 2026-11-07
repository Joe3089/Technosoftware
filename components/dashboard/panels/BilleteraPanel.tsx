"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, PiggyBank, Lock, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, AlertTriangle, Loader2, ChevronDown, Plus, CheckCircle2, Clock } from "lucide-react";
import RecargaDialog, { type Limites } from "@/components/dashboard/RecargaDialog";
import type { Metodo } from "@/lib/pagos";
import type { Movimiento, ResumenProyecto, TipoMovimiento } from "@/lib/billetera";
import { cn } from "@/lib/utils";

interface Billetera {
  total: number;
  disponible: number;
  comprometido: number;
  proyectos: ResumenProyecto[];
  movimientos: Movimiento[];
  moneda: string;
}

const card = { background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" };
const fecha = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

const TIPO: Record<TipoMovimiento, { label: string; icon: React.ElementType; color: string; signo: string }> = {
  abono:      { label: "Abono",      icon: ArrowDownLeft,  color: "text-status-green", signo: "+" },
  asignacion: { label: "Asignación", icon: ArrowLeftRight, color: "text-blue-accent",  signo: "→" },
  consumo:    { label: "Consumo",    icon: ArrowUpRight,   color: "text-red-400",      signo: "−" },
  reembolso:  { label: "Reembolso",  icon: ArrowLeftRight, color: "text-cyan",         signo: "←" },
};

interface Recarga { id: string; monto: number | string; moneda: string; estado: string; detalle: string | null; metodo?: string; referencia?: string | null; created_at: string }

const RECARGA_ESTADO: Record<string, { label: string; color: string }> = {
  pendiente: { label: "En verificación", color: "text-yellow-400" },
  aprobado:  { label: "Aprobada",  color: "text-status-green" },
  rechazado: { label: "Rechazada", color: "text-red-400" },
  cancelado: { label: "Cancelada", color: "text-silver" },
  error:     { label: "Error",     color: "text-red-400" },
};

const NOMBRES: Record<string, string> = { paypal: "PayPal", zelle: "Zelle", binance: "Binance Pay", airtm: "AirTM", pago_movil: "Pago Móvil", mercantil_pa: "Mercantil Panamá" };
const nombreMetodo = (id?: string) => NOMBRES[id ?? "paypal"] ?? id;

const ESTADO: Record<string, string> = {
  pendiente: "Pendiente", en_progreso: "En progreso", revision: "Revisión", completado: "Completado", cancelado: "Cancelado",
};

function MovimientoRow({ m, proyecto, money }: { m: Movimiento; proyecto?: string; money: (n: number | string) => string }) {
  const t = TIPO[m.tipo];
  return (
    <li className="flex items-start gap-3 py-3 border-t border-glass-bd/60 first:border-t-0">
      <t.icon className={cn("w-4 h-4 mt-0.5 shrink-0", t.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-ui text-[#f0f4ff]">
          {t.label}{proyecto && <span className="text-silver"> · {proyecto}</span>}
        </p>
        <p className="text-xs text-silver/60">
          {fecha.format(new Date(m.created_at))}
          {m.metodo && ` · ${m.metodo}`}
          {m.referencia && ` · Ref. ${m.referencia}`}
        </p>
        {m.descripcion && <p className="text-xs text-silver/70 mt-0.5">{m.descripcion}</p>}
      </div>
      <span className={cn("text-sm font-mono font-semibold whitespace-nowrap", t.color)}>{t.signo} {money(m.monto)}</span>
    </li>
  );
}

export default function BilleteraPanel() {
  const [data, setData] = useState<Billetera | null>(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [recargas, setRecargas] = useState<{ lista: Recarga[]; limites: Limites; metodos: Metodo[]; disponible: boolean } | null>(null);
  const [showRecarga, setShowRecarga] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean | null; text: string } | null>(null);

  function cargar() {
    fetch("/api/billetera")
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; })
      .then(setData)
      .catch((e) => setError(e.message || "No se pudo cargar el estado de cuenta"));
    fetch("/api/recargas")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setRecargas({ lista: j.recargas, limites: j.limites, metodos: j.metodos ?? [], disponible: j.disponible }))
      .catch(() => {});
  }

  useEffect(() => {
    // Returning from PayPal: the outcome is verified on the server, never taken from the URL
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("recarga");
    if (!id) { cargar(); return; }
    window.history.replaceState(null, "", "/dashboard");
    setResultado({ ok: null, text: "Verificando el pago con PayPal…" });
    fetch(`/api/recargas/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: sp.get("cancelado") ? "cancelar" : "confirmar" }),
    })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j.recarga as Recarga; })
      .then((rec) => {
        const m = new Intl.NumberFormat("es", { style: "currency", currency: rec.moneda }).format(Number(rec.monto));
        const textos: Record<string, [boolean | null, string]> = {
          aprobado:  [true,  `Recarga de ${m} acreditada en tu saldo.`],
          pendiente: [null,  rec.detalle ?? `Tu recarga de ${m} está pendiente de confirmación por PayPal.`],
          cancelado: [false, `Cancelaste la recarga de ${m}. No se realizó ningún cobro.`],
          rechazado: [false, `PayPal rechazó la recarga de ${m}.`],
          error:     [false, rec.detalle ?? "Ocurrió un error con la recarga."],
        };
        const [ok, text] = textos[rec.estado] ?? [false, "Estado de recarga desconocido."];
        setResultado({ ok, text });
      })
      .catch((e) => setResultado({ ok: false, text: e.message || "No se pudo verificar el pago." }))
      .finally(cargar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (n: number | string) =>
    new Intl.NumberFormat("es", { style: "currency", currency: data?.moneda ?? "USD" }).format(Number(n));

  const header = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Estado de Cuenta</h2>
          <p className="text-sm text-silver mt-1">Tu saldo y cómo está distribuido entre tus proyectos.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => setShowRecarga(true)} disabled={!recargas}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui font-semibold text-white hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" /> Recargar el Saldo
          </button>
          {recargas && !recargas.disponible && <span className="text-xs text-silver/60">Aún no hay métodos de pago habilitados</span>}
        </div>
      </div>
      {resultado && (
        <div className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-ui",
          resultado.ok === true ? "border-status-green/40 text-status-green" : resultado.ok === null ? "border-yellow-400/40 text-yellow-400" : "border-red-400/40 text-red-400")}>
          {resultado.ok === true ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : resultado.ok === null ? <Clock className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {resultado.text}
        </div>
      )}
      {recargas && <RecargaDialog open={showRecarga} onClose={() => setShowRecarga(false)} limites={recargas.limites} metodos={recargas.metodos} onReportado={cargar} />}
    </>
  );

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        {header}
        <div className="rounded-2xl border border-glass-bd p-8 flex justify-center" style={card}>
          {error
            ? <p className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" /> {error}</p>
            : <Loader2 className="w-6 h-6 text-blue-accent animate-spin" />}
        </div>
      </div>
    );
  }

  const nombres = new Map(data.proyectos.map((p) => [p.id, p.nombre]));
  const totales = [
    { label: "Saldo total",      value: data.total,        icon: Wallet,    color: "text-[#f0f4ff]" },
    { label: "Disponible",       value: data.disponible,   icon: PiggyBank, color: "text-status-green" },
    { label: "Asignado a proyectos", value: data.comprometido, icon: Lock,  color: "text-blue-accent" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      {header}

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {totales.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-glass-bd p-4 flex flex-col gap-2" style={card}>
            <Icon className={cn("w-4 h-4", color)} />
            <span className={cn("font-mono text-2xl font-bold", color)}>{money(value)}</span>
            <span className="text-xs font-ui text-silver/70">{label}</span>
          </div>
        ))}
      </div>

      {/* Distribution per project */}
      <div className="rounded-2xl border border-glass-bd p-4 sm:p-6 flex flex-col gap-4" style={card}>
        <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/50">Distribución por proyecto</p>
        {data.proyectos.length === 0 ? (
          <p className="text-sm text-silver/70 py-4 text-center">Todavía no tienes proyectos asociados a tu cuenta.</p>
        ) : (
          data.proyectos.map((p) => {
            const pct = p.asignado > 0 ? Math.min(100, Math.round((p.utilizado / p.asignado) * 100)) : 0;
            const movs = data.movimientos.filter((m) => m.proyecto_id === p.id);
            const open = abierto === p.id;
            return (
              <div key={p.id} className="rounded-xl border border-glass-bd/70 p-4">
                <button onClick={() => setAbierto(open ? null : p.id)} className="w-full flex items-center justify-between gap-3 text-left">
                  <span className="text-sm font-ui font-semibold text-[#f0f4ff] truncate">{p.nombre}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-silver/70">{ESTADO[p.estado] ?? p.estado}</span>
                    <ChevronDown className={cn("w-4 h-4 text-silver transition-transform", open && "rotate-180")} />
                  </span>
                </button>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-ui">
                  <div><p className="text-silver/60">Asignado</p><p className="font-mono text-[#f0f4ff]">{money(p.asignado)}</p></div>
                  <div><p className="text-silver/60">Utilizado</p><p className="font-mono text-red-400">{money(p.utilizado)}</p></div>
                  <div><p className="text-silver/60">Restante</p><p className="font-mono text-status-green">{money(p.restante)}</p></div>
                </div>
                <div className="h-1.5 mt-3 rounded-full bg-navy-mid overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-accent to-cyan" style={{ width: `${pct}%` }} />
                </div>
                {open && (
                  movs.length
                    ? <ul className="mt-3">{movs.map((m) => <MovimientoRow key={m.id} m={m} money={money} />)}</ul>
                    : <p className="mt-3 text-xs text-silver/60">Este proyecto aún no tiene movimientos.</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Recent top-ups (incl. pending / rejected, which never touch the balance) */}
      {recargas && recargas.lista.length > 0 && (
        <div className="rounded-2xl border border-glass-bd p-4 sm:p-6" style={card}>
          <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/50 mb-2">Recargas recientes</p>
          <ul>
            {recargas.lista.map((r) => {
              const e = RECARGA_ESTADO[r.estado] ?? { label: r.estado, color: "text-silver" };
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-glass-bd/60 first:border-t-0">
                  <div className="min-w-0">
                    <p className="text-sm font-ui text-[#f0f4ff]">{nombreMetodo(r.metodo)} · {fecha.format(new Date(r.created_at))}{r.referencia && <span className="text-silver/60"> · Ref. {r.referencia}</span>}</p>
                    {r.detalle && <p className="text-xs text-silver/60 truncate">{r.detalle}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-[#f0f4ff]">{money(r.monto)}</p>
                    <p className={cn("text-xs font-ui", e.color)}>{e.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Ledger */}
      <div className="rounded-2xl border border-glass-bd p-4 sm:p-6" style={card}>
        <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/50 mb-2">Movimientos</p>
        {data.movimientos.length === 0 ? (
          <p className="text-sm text-silver/70 py-4 text-center">Aún no hay movimientos en tu cuenta.</p>
        ) : (
          <ul>
            {data.movimientos.map((m) => (
              <MovimientoRow key={m.id} m={m} money={money} proyecto={m.proyecto_id ? nombres.get(m.proyecto_id) : undefined} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
