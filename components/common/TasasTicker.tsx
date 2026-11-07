"use client";

import { useEffect, useState } from "react";
import { DollarSign, Euro, Coins, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tasa { id: "usd_bcv" | "eur_bcv" | "usdt_binance"; valor: number; fecha: string | null; fuente: string }

const META = {
  usd_bcv:      { label: "Dólar BCV",    Icon: DollarSign, color: "text-status-green" },
  eur_bcv:      { label: "Euro BCV",     Icon: Euro,       color: "text-cyan" },
  usdt_binance: { label: "USDT Binance", Icon: Coins,      color: "text-amber-400" },
} as const;

const bs = (n: number) => `Bs. ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Animated strip with live VES rates; refreshes every minute. */
export default function TasasTicker({ className }: { className?: string }) {
  const [tasas, setTasas] = useState<Tasa[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () => fetch("/api/tasas").then((r) => r.json()).then((j) => {
      if (!vivo || !j.tasas?.length) return;
      setTasas(j.tasas);
    }).catch(() => {});
    cargar();
    const t = setInterval(cargar, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (!tasas) return <div className={cn("h-10 rounded-xl border border-glass-bd bg-white/5 animate-pulse", className)} />;

  const items = tasas.map((t) => {
    const m = META[t.id];
    return (
      <span key={t.id} className="inline-flex items-center gap-2 px-5 whitespace-nowrap">
        <m.Icon className={cn("w-4 h-4", m.color)} />
        <span className="text-silver text-xs uppercase tracking-wider">{m.label}</span>
        <strong translate="no" className={cn("font-mono text-sm", m.color)}>{bs(t.valor)}</strong>
        <span className="text-silver/30">•</span>
      </span>
    );
  });

  return (
    <div className={cn("relative flex items-center rounded-xl border border-glass-bd overflow-hidden", className)}
      style={{ background: "linear-gradient(90deg, rgba(8,14,26,0.95), rgba(21,32,64,0.85))" }}
      role="marquee" aria-label="Tasas de cambio en bolívares">
      <span className="relative z-10 shrink-0 flex items-center gap-1.5 px-3 h-10 text-[11px] font-ui font-semibold uppercase tracking-widest text-status-green border-r border-glass-bd"
        style={{ background: "rgba(8,14,26,0.98)" }}>
        <Radio className="w-3.5 h-3.5 animate-pulse" /> <span className="hidden sm:inline">En vivo</span>
      </span>
      <div className="flex-1 overflow-hidden" aria-hidden="true">
        {/* Two identical halves → seamless loop */}
        <div className="flex w-max animate-ticker hover:[animation-play-state:paused] py-2.5">
          <div className="flex">{items}</div>
          <div className="flex">{items}</div>
        </div>
      </div>
    </div>
  );
}
