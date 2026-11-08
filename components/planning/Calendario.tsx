"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hoy } from "@/components/management/ui";
import { ESTADOS_TAREA, color } from "@/lib/services/constantes";
import { vencida, type Actualizar, type Tarea } from "@/components/planning/comun";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const aDia = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const aISO = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);

/** Calendario mensual por fecha de finalización (o inicio si no tiene). Arrastrar cambia la fecha conservando la duración. */
export function VistaCalendario({ tareas, actualizar, abrir, nueva }: { tareas: Tarea[]; actualizar: Actualizar; abrir: (id: string) => void; nueva: (dia: string) => void }) {
  const h = hoy();
  const [mes, setMes] = useState(() => h.slice(0, 7));
  const [sobre, setSobre] = useState<string | null>(null);
  const [y, m] = mes.split("-").map(Number);
  const primero = Date.UTC(y, m - 1, 1) / 864e5;
  const offset = (new Date(primero * 864e5).getUTCDay() + 6) % 7;
  const celdas = Array.from({ length: 42 }, (_, i) => aISO(primero - offset + i));

  const porDia = useMemo(() => {
    const r = new Map<string, Tarea[]>();
    for (const t of tareas) { const d = t.fin ?? t.inicio; if (d) r.set(d, [...(r.get(d) ?? []), t]); }
    return r;
  }, [tareas]);

  const cambiarMes = (d: number) => { const f = new Date(Date.UTC(y, m - 1 + d, 1)); setMes(f.toISOString().slice(0, 7)); };
  const soltar = (dia: string, id: string) => {
    setSobre(null);
    const t = tareas.find((x) => x.id === id);
    if (!t) return;
    const actual = t.fin ?? t.inicio!;
    if (actual === dia) return;
    const delta = aDia(dia) - aDia(actual);
    actualizar(id, { fin: t.fin ? dia : t.fin, inicio: t.inicio ? aISO(aDia(t.inicio) + delta) : t.inicio });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft className="w-4 h-4" /></Button>
        <h3 className="font-ui font-semibold capitalize min-w-[150px] text-center">{new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es", { month: "long", year: "numeric", timeZone: "UTC" })}</h3>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setMes(h.slice(0, 7))}>Hoy</Button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px] rounded-xl border border-glass-bd overflow-hidden">
          {DIAS.map((d) => <div key={d} className="px-2 py-1.5 text-[11px] text-silver font-ui border-b border-glass-bd bg-white/[0.03]">{d}</div>)}
          {celdas.map((d) => {
            const lista = porDia.get(d) ?? [];
            const fuera = !d.startsWith(mes);
            return (
              <div key={d} className={cn("min-h-[104px] border-b border-r border-glass-bd/50 p-1 flex flex-col gap-1", fuera && "bg-black/20", sobre === d && "bg-blue-accent/10")}
                onDragOver={(e) => { e.preventDefault(); setSobre(d); }} onDragLeave={() => setSobre((s) => (s === d ? null : s))}
                onDrop={(e) => { e.preventDefault(); soltar(d, e.dataTransfer.getData("text/plain")); }}>
                <button onClick={() => nueva(d)} className={cn("self-end text-[11px] w-6 h-6 rounded-full hover:bg-white/10", d === h ? "bg-cyan text-navy-deep font-bold" : fuera ? "text-silver/40" : "text-silver")}
                  aria-label={`Nueva actividad el ${d}`} translate="no">{Number(d.slice(8))}</button>
                {lista.slice(0, 3).map((t) => (
                  <button key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} onClick={() => abrir(t.id)}
                    className={cn("text-left text-[11px] rounded px-1.5 py-0.5 truncate border-l-2", vencida(t, h) ? "bg-red-500/15" : "bg-white/[0.05]", t.estado === "completada" && "line-through opacity-60")}
                    style={{ borderColor: color(ESTADOS_TAREA, t.estado) }} title={t.titulo}>{t.es_hito && "◆ "}{t.titulo}</button>
                ))}
                {lista.length > 3 && <span className="text-[10px] text-silver/70 px-1" translate="no">+{lista.length - 3} más</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
