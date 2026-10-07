"use client";

import { motion } from "framer-motion";
import { FolderOpen, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROJECTS = [
  { name: "ERP Empresarial",   status: "En progreso", pct: 72,  color: "from-blue-accent to-blue-bright",  tag: "Activo"    },
  { name: "AppFlow Commerce",  status: "Revisión",    pct: 95,  color: "from-cyan to-blue-accent",          tag: "Revisión"  },
  { name: "CloudNet Gateway",  status: "Completado",  pct: 100, color: "from-status-green to-cyan",         tag: "Completado" },
];

const STATS = [
  { icon: FolderOpen,   label: "Activos",    value: "2", color: "text-blue-accent" },
  { icon: Clock,        label: "En revisión",value: "1", color: "text-cyan"         },
  { icon: CheckCircle2, label: "Completados",value: "1", color: "text-status-green"  },
  { icon: TrendingUp,   label: "Progreso",   value: "86%",color: "text-yellow-400"  },
];

export default function ProyectosPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      <div>
        <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Mis Proyectos</h2>
        <p className="text-sm text-silver mt-1">Seguimiento de todos tus proyectos activos y completados.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-glass-bd p-4 flex flex-col gap-2"
            style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" }}>
            <Icon className={cn("w-4 h-4", color)} />
            <span className={cn("font-mono text-2xl font-bold", color)}>{value}</span>
            <span className="text-xs font-ui text-silver/70">{label}</span>
          </div>
        ))}
      </div>

      {/* Project list */}
      <div className="rounded-2xl border border-glass-bd p-6 flex flex-col gap-5"
        style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" }}>
        <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/50">Proyectos Recientes</p>
        {PROJECTS.map(({ name, status, pct, color, tag }) => (
          <div key={name} className="flex flex-col gap-2">
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
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
