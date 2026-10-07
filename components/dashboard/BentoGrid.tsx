"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, FolderOpen, Home, User,
  TrendingUp, CreditCard, Calendar, Star,
  Clock, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalData, isProfileComplete, completionPercent } from "@/hooks/usePersonalData";
import { type PanelId } from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";

/* ─── Static data ─── */
const STATS = [
  { icon: FolderOpen,   label: "Proyectos activos", value: "3",   color: "text-blue-accent" },
  { icon: CheckCircle2, label: "Completados",        value: "12",  color: "text-status-green" },
  { icon: Clock,        label: "Horas soporte",      value: "48h", color: "text-cyan" },
  { icon: Star,         label: "Valoración",         value: "4.9", color: "text-yellow-400" },
];

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: "Nuevo mensaje",   href: "#",  color: "text-cyan"         },
  { icon: FolderOpen,    label: "Ver proyectos",   href: "#",  color: "text-blue-accent"  },
  { icon: Home,          label: "Ir al inicio",    href: "/",  color: "text-status-green" },
];

const PAYMENTS = [
  { name: "Zelle",      tag: "USD",  active: true  },
  { name: "PayPal",     tag: "USD",  active: true  },
  { name: "Binance",    tag: "USDT", active: true  },
  { name: "AirTM",      tag: "USD",  active: false },
  { name: "Pago Móvil", tag: "VES",  active: false },
];

const PROJECTS_PREVIEW = [
  { name: "ERP Empresarial",   status: "En progreso", pct: 72,  color: "from-blue-accent to-blue-bright" },
  { name: "AppFlow Commerce",  status: "Revisión",    pct: 95,  color: "from-cyan to-blue-accent"         },
  { name: "CloudNet Gateway",  status: "Completado",  pct: 100, color: "from-status-green to-cyan"        },
];

const LOCKED_SECTIONS = ["Contáctanos", "Estatus de Proyectos", "Historial", "Historial de Proyectos"];

/* ─── Tile wrapper ─── */
function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "rounded-2xl border border-glass-bd overflow-hidden",
        className
      )}
      style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.4) 100%)" }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Main grid ─── */
export default function BentoGrid({ onNavigate }: { onNavigate?: (id: PanelId) => void } = {}) {
  const { user } = useAuth(false);
  const { data } = usePersonalData();
  const [loaded, setLoaded] = useState(false);
  const profileComplete = isProfileComplete(data);
  const pct = completionPercent(data);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 rounded-2xl w-full" />
        <Skeleton className="h-20 rounded-2xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {[8, 4, 4, 8, 4, 4].map((span, i) => (
            <Skeleton key={i} className={cn("h-44 rounded-2xl", `lg:col-span-${span}`)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-6xl">

      {/* ── Welcome banner (full width) — mirrors screenshot ── */}
      <Tile className="relative overflow-hidden">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(77,127,255,0.6) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center gap-5 p-6">
          {/* Avatar circle */}
          <div className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-blue-accent/40"
            style={{ background: "rgba(77,127,255,0.15)" }}>
            <User className="w-7 h-7 text-blue-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-ui text-xl font-semibold text-[#f0f4ff] truncate">
              Bienvenido,{" "}
              <span className="text-cyan">{user?.email ?? user?.name ?? "usuario"}</span>
            </h1>
            <p className="text-sm text-silver mt-0.5">
              Estás dentro de tu panel de Technosoftware.{" "}
              <span className="text-blue-accent font-semibold">Sesión activa.</span>
            </p>
          </div>
          {/* Decorative 3D logo */}
          <div className="shrink-0 hidden lg:block">
            <Image
              src="/logo.png"
              alt="Technosoftware"
              width={44}
              height={44}
              className="animate-spin-3d-slow drop-shadow-[0_0_16px_rgba(77,127,255,0.5)] opacity-70"
            />
          </div>
        </div>
      </Tile>

      {/* ── Profile completion reminder — amber banner like screenshot ── */}
      {!profileComplete && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
          style={{
            background: "rgba(120,80,0,0.2)",
            borderColor: "rgba(234,179,8,0.35)",
          }}
        >
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-ui font-semibold uppercase tracking-widest text-yellow-400 mb-0.5">
              Completa tu perfil
            </p>
            <p className="text-sm text-silver">
              Para acceder a{" "}
              {LOCKED_SECTIONS.map((s, i) => (
                <span key={s}>
                  <strong className="text-[#f0f4ff]">{s}</strong>
                  {i < LOCKED_SECTIONS.length - 1 ? ", " : ""}
                </span>
              ))}
              {" "}debes completar tus datos personales primero.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.("datos-personales")}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-ui font-semibold text-yellow-900 transition-all whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #ca8a04 0%, #d97706 100%)" }}
          >
            Completar ahora
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

        {/* Stats — narrow */}
        <Tile className="lg:col-span-4 p-5">
          <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60 mb-4">Resumen</p>
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <Icon className={cn("w-4 h-4", color)} />
                <span className={cn("font-mono text-2xl font-bold leading-none", color)}>{value}</span>
                <span className="text-[11px] font-ui text-silver/70 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </Tile>

        {/* Quick actions */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-3">
          <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60">Acciones rápidas</p>
          {QUICK_ACTIONS.map(({ icon: Icon, label, href, color }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-glass-bd hover:border-blue-accent/40 hover:bg-white/5 transition-all group"
            >
              <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", color)} />
              <span className="text-sm font-ui text-silver group-hover:text-white transition-colors flex-1">{label}</span>
              <ChevronRightIcon />
            </Link>
          ))}
        </Tile>

        {/* Profile status */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-accent" />
            <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60">Perfil</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-ui">
              <span className="text-silver">Completitud</span>
              <span className="text-blue-accent font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-accent to-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-silver/50">Completa tus datos para desbloquear todas las funciones.</p>
          </div>
          <button
            onClick={() => onNavigate?.("datos-personales")}
            className="mt-auto py-2 rounded-xl border border-blue-accent/30 text-xs font-ui text-blue-accent hover:bg-blue-accent/10 transition-colors"
          >
            Ir a Perfil →
          </button>
        </Tile>

        {/* Projects — wide */}
        <Tile className="lg:col-span-8 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-accent" />
              <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60">Proyectos recientes</p>
            </div>
            <Badge variant="default">3 activos</Badge>
          </div>
          <div className="flex flex-col gap-4">
            {PROJECTS_PREVIEW.map(({ name, status, pct, color }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-ui text-[#f0f4ff]">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-silver">{pct}%</span>
                    <Badge variant={pct === 100 ? "green" : "default"}>{status}</Badge>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Tile>

        {/* Payments */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-cyan" />
            <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60">Métodos de Pago</p>
          </div>
          {PAYMENTS.map(({ name, tag, active }) => (
            <div key={name} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-status-green" : "bg-silver/30")} />
                <span className="text-sm font-ui text-[#f0f4ff]">{name}</span>
              </div>
              <span className="text-xs font-mono text-silver/50">{tag}</span>
            </div>
          ))}
        </Tile>

        {/* Schedule */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-status-green" />
            <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/60">Próxima sesión</p>
          </div>
          <p className="text-xs text-silver/60">Sin reuniones agendadas</p>
          <Link
            href="/#contacto"
            className="mt-auto py-2 px-4 rounded-xl border border-status-green/30 text-xs font-ui text-status-green hover:bg-status-green/10 transition-colors text-center"
          >
            Agendar consultoría →
          </Link>
        </Tile>

        {/* Large logo tile — decorative, mirrors screenshot */}
        <Tile className="lg:col-span-4 p-5 flex flex-col items-center justify-center gap-3 min-h-[180px] relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at center, rgba(0,207,255,0.08) 0%, transparent 70%)" }}
          />
          <Image
            src="/logo.png"
            alt="Technosoftware"
            width={80}
            height={80}
            className="animate-spin-3d drop-shadow-[0_0_28px_rgba(0,207,255,0.5)] relative z-10"
          />
          <div className="text-center relative z-10">
            <p className="font-display text-lg text-[#f0f4ff] tracking-widest">TECHNOSOFTWARE</p>
            <p className="text-[10px] font-ui text-silver/50 uppercase tracking-widest">Agencia de Soporte y Desarrollo</p>
          </div>
        </Tile>

      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return <svg className="w-3.5 h-3.5 text-silver/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>;
}
