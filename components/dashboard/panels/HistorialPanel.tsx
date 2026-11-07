"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LogIn, LogOut, UserPen, Camera, FolderPlus, FolderPen, FolderX, Wallet,
  Users, Mail, Activity, AlertTriangle, Loader2, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Evento {
  id: number;
  accion: string;
  descripcion: string;
  entidad: string | null;
  created_at: string;
}

const ICONOS: Record<string, React.ElementType> = {
  inicio_sesion: LogIn,
  cierre_sesion: LogOut,
  datos_personales_actualizados: UserPen,
  foto_perfil_actualizada: Camera,
  proyecto_creado: FolderPlus,
  proyecto_actualizado: FolderPen,
  proyecto_eliminado: FolderX,
  cliente_creado: Users,
  cliente_actualizado: Users,
  cliente_eliminado: Users,
  correo_masivo_enviado: Mail,
};

const iconFor = (accion: string) => ICONOS[accion] ?? (accion.startsWith("movimiento_") ? Wallet : Activity);

const fecha = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

const card = { background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.35) 100%)" };

export default function HistorialPanel() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (antes?: number) => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/actividad${antes ? `?antes=${antes}` : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudo cargar el historial");
      setEventos((prev) => (antes ? [...prev, ...j.eventos] : j.eventos));
      setHayMas(j.hayMas);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      <div>
        <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Historial</h2>
        <p className="text-sm text-silver mt-1">Acciones realizadas en tu cuenta, de la más reciente a la más antigua.</p>
      </div>

      <div className="rounded-2xl border border-glass-bd p-4 sm:p-6" style={card}>
        {eventos.length > 0 && (
          <ol className="flex flex-col">
            {eventos.map((ev, i) => {
              const Icon = iconFor(ev.accion);
              return (
                <li key={ev.id} className={cn("flex items-start gap-3 py-3", i > 0 && "border-t border-glass-bd/60")}>
                  <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-blue-accent/30"
                    style={{ background: "rgba(77,127,255,0.12)" }}>
                    <Icon className="w-4 h-4 text-blue-accent" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-ui text-[#f0f4ff]">{ev.descripcion}</p>
                    <time dateTime={ev.created_at} className="text-xs text-silver/60">
                      {fecha.format(new Date(ev.created_at))}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {!loading && !error && eventos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Activity className="w-8 h-8 text-silver/40" />
            <p className="text-sm font-ui text-silver">Aún no hay actividad registrada.</p>
            <p className="text-xs text-silver/50">Tus inicios de sesión y cambios aparecerán aquí.</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" /> {error}</p>
            <button onClick={() => cargar(eventos.at(-1)?.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5">
              <RotateCcw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-blue-accent animate-spin" /></div>
        )}

        {hayMas && !loading && !error && (
          <button onClick={() => cargar(eventos.at(-1)?.id)}
            className="mt-3 w-full py-2.5 rounded-xl border border-blue-accent/30 text-sm font-ui text-blue-accent hover:bg-blue-accent/10 transition-colors">
            Cargar más
          </button>
        )}
      </div>
    </motion.div>
  );
}
