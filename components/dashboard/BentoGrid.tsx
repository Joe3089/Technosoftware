"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare, FolderOpen, Home, User,
  TrendingUp, CreditCard, Calendar, Star,
  Clock, CheckCircle2, AlertTriangle, ArrowRight, FileSignature,
} from "lucide-react";
import { ESTADO_LABEL } from "@/lib/proyectos";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMetodosPago } from "@/hooks/useMetodosPago";
import { usePersonalData, isProfileComplete, completionPercent } from "@/hooks/usePersonalData";
import { type PanelId } from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";

interface Resumen {
  activos: number; completados: number; consultoriasAbiertas: number; valoracion: number | null;
  recientes: { id: string; nombre: string; estado: string; avance: number | null }[];
  proximaReunion: { fecha_hora: string; zona_horaria: string; modalidad: string; estado: string } | null;
}

const QUICK_ACTIONS: { icon: React.ElementType; label: string; panel: PanelId; color: string }[] = [
  { icon: MessageSquare, label: "Nueva consultoría",      panel: "consultoria",       color: "text-cyan"         },
  { icon: FolderOpen,    label: "Ver mis proyectos",      panel: "estatus-proyectos", color: "text-blue-accent"  },
  { icon: FileSignature, label: "Presupuesto y contrato", panel: "contratacion",      color: "text-status-green" },
];

const BARRA: Record<string, string> = {
  completado: "from-status-green to-cyan", revision: "from-cyan to-blue-accent", pendiente: "from-silver/40 to-silver/20",
};

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
  const isAdmin = user?.role === "admin";
  const metodos = useMetodosPago(!!user);
  const profileComplete = isAdmin || isProfileComplete(data);
  const pct = completionPercent(data);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    fetch("/api/resumen").then((r) => (r.ok ? r.json() : null)).then(setResumen).catch(() => {});
  }, []);

  const stats = [
    { icon: FolderOpen,   label: "Proyectos activos",     value: resumen?.activos,              color: "text-blue-accent" },
    { icon: CheckCircle2, label: "Completados",           value: resumen?.completados,          color: "text-status-green" },
    { icon: Clock,        label: "Consultorías abiertas", value: resumen?.consultoriasAbiertas, color: "text-cyan" },
    { icon: Star,         label: "Valoración",            value: resumen ? (resumen.valoracion?.toFixed(1) ?? "—") : undefined, color: "text-yellow-400" },
  ];
  const fmtReunion = (r: NonNullable<Resumen["proximaReunion"]>) =>
    new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: r.zona_horaria }).format(new Date(r.fecha_hora));

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
          <div className="shrink-0 w-20 h-20 rounded-full flex items-center justify-center border-2 border-blue-accent/40"
            style={{ background: "rgba(77,127,255,0.15)" }}>
            <User className="w-10 h-10 text-blue-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-ui text-xl font-semibold text-[#f0f4ff] truncate">
              Bienvenido,{" "}
              <span className="text-cyan break-all">{user?.email ?? user?.name ?? "usuario"}</span>
            </h1>
            <p className="text-sm text-silver mt-0.5">
              Estás dentro de tu panel de Technosoftware.{" "}
              <span className="text-blue-accent font-semibold">Sesión activa.</span>
            </p>
          </div>
          {/* Decorative 3D logo */}
          <div className="shrink-0 hidden lg:block">
            <Image
              src="/logo-full.png"
              alt="Technosoftware"
              width={300}
              height={105}
              className="w-[300px] h-auto animate-spin-3d-slow drop-shadow-[0_0_16px_rgba(77,127,255,0.5)] opacity-90"
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
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 rounded-2xl border"
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
          <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60 mb-4">Resumen</p>
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <Icon className={cn("w-4 h-4", color)} />
                {value === undefined
                  ? <Skeleton className="h-6 w-10" />
                  : <span className={cn("font-mono text-2xl font-bold leading-none", color)}>{value}</span>}
                <span className="text-xs font-ui text-silver/70 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </Tile>

        {/* Quick actions */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-3">
          <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">Acciones rápidas</p>
          {QUICK_ACTIONS.map(({ icon: Icon, label, panel, color }) => (
            <button
              key={label}
              onClick={() => onNavigate?.(panel)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-glass-bd hover:border-blue-accent/40 hover:bg-white/5 transition-all group text-left"
            >
              <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", color)} />
              <span className="text-sm font-ui text-silver group-hover:text-white transition-colors flex-1">{label}</span>
              <ChevronRightIcon />
            </button>
          ))}
        </Tile>

        {/* Profile status */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-accent" />
            <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">Perfil</p>
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
            <p className="text-xs text-silver/50">
              {isAdmin ? "Opcional para administradores." : "Completa tus datos para desbloquear todas las funciones."}
            </p>
          </div>
          <button
            onClick={() => onNavigate?.("datos-personales")}
            className="mt-auto py-2 rounded-xl border border-blue-accent/30 text-xs font-ui text-blue-accent hover:bg-blue-accent/10 transition-colors"
          >
            Ir a Perfil →
          </button>
        </Tile>

        {/* Projects — wide, spans two rows so payments + schedule stack beside it */}
        <Tile className="lg:col-span-8 lg:row-span-2 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-accent" />
              <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">Proyectos recientes</p>
            </div>
            {resumen && <Badge variant="default">{resumen.activos} {resumen.activos === 1 ? "activo" : "activos"}</Badge>}
          </div>
          <div className="flex flex-col gap-4">
            {!resumen && [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
            {resumen?.recientes.length === 0 && (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-sm text-silver/70">{isAdmin ? "Todavía no hay proyectos registrados." : "Aún no tienes proyectos. Cuéntanos tu idea y te enviaremos un presupuesto."}</p>
                {!isAdmin && (
                  <button onClick={() => onNavigate?.("nuevo-proyecto")} className="py-2 px-4 rounded-xl border border-blue-accent/30 text-xs font-ui text-blue-accent hover:bg-blue-accent/10">
                    Solicitar nuevo proyecto →
                  </button>
                )}
              </div>
            )}
            {resumen?.recientes.map(({ id, nombre, estado, avance }) => {
              const pctP = estado === "completado" ? 100 : avance ?? 0;
              return (
                <button key={id} onClick={() => onNavigate?.("estatus-proyectos")} className="flex flex-col gap-1.5 text-left group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-ui text-[#f0f4ff] truncate group-hover:text-cyan transition-colors">{nombre}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-silver">{pctP}%</span>
                      <Badge variant={estado === "completado" ? "green" : "default"}>{ESTADO_LABEL[estado] ?? estado}</Badge>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full bg-gradient-to-r", BARRA[estado] ?? "from-blue-accent to-blue-bright")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pctP}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Tile>

        {/* Payments */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-cyan" />
            <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">Métodos de Pago</p>
          </div>
          {!metodos ? (
            <Skeleton className="h-16 w-full" />
          ) : metodos.length === 0 ? (
            <p className="text-xs text-silver/60">No hay métodos de pago disponibles por ahora.</p>
          ) : (
            metodos.map((m) => (
              <button key={m.id} onClick={() => onNavigate?.(m.id.replace("_", "-") as PanelId)}
                className="flex items-center justify-between py-0.5 text-left group">
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", m.disponible ? "bg-status-green" : "bg-silver/30")} />
                  <span className="text-sm font-ui text-[#f0f4ff] group-hover:text-cyan transition-colors">{m.nombre}</span>
                </div>
                <span className="text-xs font-mono text-silver/50">{m.moneda}</span>
              </button>
            ))
          )}
        </Tile>

        {/* Schedule */}
        <Tile className="lg:col-span-4 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-status-green" />
            <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">Próxima sesión</p>
          </div>
          {resumen?.proximaReunion ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-ui text-[#f0f4ff]">{fmtReunion(resumen.proximaReunion)}</p>
              <p className="text-xs text-silver/70">
                {resumen.proximaReunion.modalidad === "presencial" ? "Presencial" : "Virtual"}
                {" · "}
                {resumen.proximaReunion.estado === "confirmada" ? "Confirmada" : "Pendiente de confirmación"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-silver/60">{resumen ? "Sin reuniones agendadas" : "Cargando…"}</p>
          )}
          <button
            onClick={() => onNavigate?.("consultoria")}
            className="mt-auto py-2 px-4 rounded-xl border border-status-green/30 text-xs font-ui text-status-green hover:bg-status-green/10 transition-colors text-center"
          >
            Agendar consultoría →
          </button>
        </Tile>

      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return <svg className="w-3.5 h-3.5 text-silver/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>;
}
