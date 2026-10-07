"use client";

import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const METHODS = [
  {
    id: "zelle",
    name: "Zelle",
    tag: "USD",
    active: true,
    detail: "Transferencias directas entre bancos de EE.UU.",
    handle: "@technosoftware",
  },
  {
    id: "paypal",
    name: "PayPal",
    tag: "USD",
    active: true,
    detail: "Pago internacional seguro con protección al comprador.",
    handle: "paypal.me/technosoftware",
  },
  {
    id: "binance",
    name: "Binance Pay",
    tag: "USDT",
    active: true,
    detail: "Pagos en criptomonedas estables (USDT TRC-20).",
    handle: "ID: 12345678",
  },
  {
    id: "airtm",
    name: "AirTM",
    tag: "USD",
    active: false,
    detail: "Disponible próximamente para clientes latinoamericanos.",
    handle: null,
  },
  {
    id: "pagomovil",
    name: "Pago Móvil",
    tag: "VES",
    active: false,
    detail: "Próximamente disponible en bolívares (BCV).",
    handle: null,
  },
];

export default function PagosPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      <div>
        <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Métodos de Pago</h2>
        <p className="text-sm text-silver mt-1">Opciones disponibles para efectuar pagos por nuestros servicios.</p>
      </div>

      <div className="flex flex-col gap-3">
        {METHODS.map(({ id, name, tag, active, detail, handle }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: METHODS.findIndex((m) => m.id === id) * 0.07 }}
            className={cn(
              "rounded-xl border p-5 flex items-center gap-5 transition-colors",
              active
                ? "border-glass-bd hover:border-blue-accent/30"
                : "border-glass-bd/40 opacity-60"
            )}
            style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.85) 0%, rgba(30,53,115,0.3) 100%)" }}
          >
            {/* Status dot */}
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              active ? "bg-status-green shadow-[0_0_6px_rgba(0,230,118,0.6)]" : "bg-silver/30"
            )} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-ui font-semibold text-[#f0f4ff]">{name}</span>
                <span className="text-[10px] font-mono text-silver/50 px-1.5 py-0.5 rounded border border-glass-bd">{tag}</span>
                {!active && <span className="text-[10px] font-ui text-silver/40 italic">Próximamente</span>}
              </div>
              <p className="text-xs text-silver/70 mt-0.5">{detail}</p>
              {handle && <p className="text-xs font-mono text-blue-accent mt-1">{handle}</p>}
            </div>

            {active ? (
              <CheckCircle2 className="w-5 h-5 text-status-green shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-silver/30 shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-silver/40 text-center">
        Para coordinar el pago de tu proyecto, contáctanos directamente con el método de tu preferencia.
      </p>
    </motion.div>
  );
}
