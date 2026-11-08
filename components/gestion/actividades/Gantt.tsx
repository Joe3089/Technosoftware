"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../contexto";
import { hoy } from "../ui";
import { ESTADOS_TAREA, color, nombreEmpleado } from "@/lib/gestion/constantes";
import { vencida, type Actualizar, type Tarea } from "./comun";

type Escala = "dia" | "semana" | "mes";
const PX: Record<Escala, number> = { dia: 34, semana: 14, mes: 4.5 };
const FILA = 34;
const IZQ = 220;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Fechas como número de día (UTC) para evitar saltos por zona horaria
const aDia = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const aISO = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);

type Arrastre = { id: string; modo: "mover" | "inicio" | "fin"; x0: number; ini: number; fin: number; dIni: number; dFin: number };

export function VistaGantt({ tareas, actualizar, abrir }: { tareas: Tarea[]; actualizar: Actualizar; abrir: (id: string) => void }) {
  const [escala, setEscala] = useState<Escala>("semana");
  const [arr, setArr] = useState<Arrastre | null>(null);
  const [deps, setDeps] = useState<{ tarea_id: string; depende_de: string }[]>([]);
  const scroll = useRef<HTMLDivElement>(null);
  const px = PX[escala];
  const h = hoy();
  const hoyN = aDia(h);

  const conFechas = useMemo(() => tareas.filter((t) => t.inicio || t.fin)
    .sort((a, b) => aDia(a.inicio ?? a.fin!) - aDia(b.inicio ?? b.fin!)), [tareas]);
  const sinFechas = tareas.filter((t) => !t.inicio && !t.fin);

  // Dependencias de las actividades visibles (en lotes, sin polling)
  const ids = conFechas.map((t) => t.id).join(",");
  useEffect(() => {
    if (!ids) { setDeps([]); return; }
    const lotes: string[][] = [];
    const lista = ids.split(",");
    for (let i = 0; i < lista.length; i += 50) lotes.push(lista.slice(i, i + 50));
    Promise.all(lotes.map((l) => api<{ datos: { tarea_id: string; depende_de: string }[] }>(`/api/gestion/tarea_dependencias?f.tarea_id=${l.join(",")}&size=200`)))
      .then((r) => setDeps(r.flatMap((x) => x.datos))).catch(() => setDeps([]));
  }, [ids]);

  const rango = useMemo(() => {
    const ns = conFechas.flatMap((t) => [t.inicio, t.fin].filter(Boolean).map((x) => aDia(x!)));
    const min = Math.min(...ns, hoyN) - (escala === "mes" ? 15 : 4);
    const max = Math.max(...ns, hoyN) + (escala === "mes" ? 45 : 14);
    return { min, dias: Math.max(max - min, escala === "dia" ? 30 : 60) };
  }, [conFechas, hoyN, escala]);

  // Centrar en hoy al cambiar de escala
  useEffect(() => { if (scroll.current) scroll.current.scrollLeft = Math.max(0, (hoyN - rango.min - 7) * px); }, [escala]); // eslint-disable-line react-hooks/exhaustive-deps

  const ancho = rango.dias * px;
  const x = (dia: number) => (dia - rango.min) * px;
  const barra = (t: Tarea) => {
    const ini = aDia(t.inicio ?? t.fin!), fin = aDia(t.fin ?? t.inicio!);
    if (arr?.id === t.id) return { ini: arr.ini + arr.dIni, fin: arr.fin + arr.dFin };
    return { ini, fin: Math.max(fin, ini) };
  };

  const iniciar = (e: React.PointerEvent, t: Tarea, modo: Arrastre["modo"]) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const b = barra(t);
    setArr({ id: t.id, modo, x0: e.clientX, ini: b.ini, fin: b.fin, dIni: 0, dFin: 0 });
  };
  const mover = (e: React.PointerEvent) => {
    if (!arr) return;
    const d = Math.round((e.clientX - arr.x0) / px);
    if (arr.modo === "mover") setArr({ ...arr, dIni: d, dFin: d });
    else if (arr.modo === "inicio") setArr({ ...arr, dIni: Math.min(d, arr.fin - arr.ini), dFin: 0 });
    else setArr({ ...arr, dIni: 0, dFin: Math.max(d, arr.ini - arr.fin) });
  };
  const soltar = () => {
    if (!arr) return;
    const a = arr; setArr(null);
    if (!a.dIni && !a.dFin) { abrir(a.id); return; }
    const t = tareas.find((x) => x.id === a.id)!;
    const cambios: Partial<Tarea> = { inicio: aISO(a.ini + a.dIni), fin: aISO(a.fin + a.dFin) };
    if (!t.inicio && a.modo === "mover") cambios.inicio = cambios.fin; // hitos de un día
    actualizar(a.id, cambios);
  };

  // Cabecera de la escala
  const marcas = useMemo(() => {
    const m: { x: number; texto: string; fuerte?: boolean }[] = [];
    for (let i = 0; i <= rango.dias; i++) {
      const n = rango.min + i, d = new Date(n * 864e5), dd = d.getUTCDate(), dow = d.getUTCDay();
      if (escala === "dia") m.push({ x: i * px, texto: String(dd), fuerte: dd === 1 || dow === 1 });
      else if (escala === "semana" && dow === 1) m.push({ x: i * px, texto: `${dd} ${MESES[d.getUTCMonth()]}`, fuerte: dd <= 7 });
      else if (escala === "mes" && dd === 1) m.push({ x: i * px, texto: `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, fuerte: d.getUTCMonth() === 0 });
    }
    return m;
  }, [rango, escala, px]);

  const fila = new Map(conFechas.map((t, i) => [t.id, i]));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Escala" className="inline-flex rounded-lg border border-glass-bd p-0.5">
          {(["dia", "semana", "mes"] as Escala[]).map((e) => (
            <button key={e} role="tab" aria-selected={escala === e} onClick={() => setEscala(e)}
              className={cn("px-2.5 py-1 text-xs rounded-md", escala === e ? "bg-blue-accent/20 text-white" : "text-silver")}>{{ dia: "Día", semana: "Semana", mes: "Mes" }[e]}</button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => scroll.current?.scrollTo({ left: Math.max(0, x(hoyN) - 200), behavior: "smooth" })}>Hoy</Button>
        <span className="text-[11px] text-silver/60 hidden md:inline">Arrastra una barra para moverla; sus bordes cambian inicio y fin.</span>
      </div>

      {!conFechas.length ? <p className="text-sm text-silver/60 py-6 text-center">Ninguna actividad tiene fechas todavía.</p> : (
        <div className="rounded-xl border border-glass-bd overflow-hidden flex">
          <div className="shrink-0 border-r border-glass-bd bg-navy/60" style={{ width: IZQ }}>
            <div className="h-9 border-b border-glass-bd px-3 flex items-center text-xs text-silver font-ui">Actividad</div>
            {conFechas.map((t) => (
              <button key={t.id} onClick={() => abrir(t.id)} className="w-full text-left px-3 flex flex-col justify-center border-b border-glass-bd/40 hover:bg-white/[0.04]" style={{ height: FILA }}>
                <span className={cn("text-xs truncate", vencida(t, h) && "text-red-300")}>{t.es_hito && "◆ "}{t.titulo}</span>
                <span className="text-[10px] text-silver/60 truncate">{nombreEmpleado(t.responsable)}</span>
              </button>
            ))}
          </div>
          <div ref={scroll} className="overflow-x-auto flex-1 select-none" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => setArr(null)}>
            <div className="relative" style={{ width: ancho, height: 36 + conFechas.length * FILA }}>
              <div className="sticky top-0 h-9 border-b border-glass-bd bg-navy/80 z-10">
                {marcas.map((m) => (
                  <span key={m.x} className={cn("absolute top-0 h-full border-l pl-1 pt-2.5 text-[10px] whitespace-nowrap", m.fuerte ? "border-silver/40 text-silver" : "border-glass-bd/50 text-silver/60")} style={{ left: m.x }}>{m.texto}</span>
                ))}
              </div>
              {marcas.map((m) => <div key={`l${m.x}`} className={cn("absolute top-9 bottom-0 border-l", m.fuerte ? "border-white/10" : "border-white/[0.04]")} style={{ left: m.x }} />)}
              <div className="absolute top-9 bottom-0 w-px bg-cyan/70 z-[1]" style={{ left: x(hoyN) + px / 2 }} title="Hoy" />

              <svg className="absolute left-0 top-9 pointer-events-none z-[2]" width={ancho} height={conFechas.length * FILA} aria-hidden>
                {deps.map((d) => {
                  const a = conFechas.find((t) => t.id === d.depende_de), b = conFechas.find((t) => t.id === d.tarea_id);
                  if (!a || !b) return null;
                  const ba = barra(a), bb = barra(b);
                  const x1 = x(ba.fin + 1), y1 = fila.get(a.id)! * FILA + FILA / 2;
                  const x2 = x(bb.ini), y2 = fila.get(b.id)! * FILA + FILA / 2;
                  const mal = bb.ini <= ba.fin;
                  return <path key={`${d.depende_de}-${d.tarea_id}`} d={`M${x1},${y1} h6 V${y2} H${x2 - 2}`} fill="none" stroke={mal ? "#ff5370" : "#9aafd4"} strokeWidth={1.2}
                    markerEnd="url(#flecha)" strokeDasharray={mal ? "3 2" : undefined} />;
                })}
                <defs><marker id="flecha" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9aafd4" /></marker></defs>
              </svg>

              {conFechas.map((t, i) => {
                const b = barra(t);
                const top = 36 + i * FILA + 7;
                const venc = vencida(t, h);
                const c = color(ESTADOS_TAREA, t.estado);
                if (t.es_hito) {
                  return (
                    <div key={t.id} role="button" tabIndex={0} aria-label={`Hito ${t.titulo}`} onPointerDown={(e) => iniciar(e, t, "mover")}
                      className="absolute z-[3] w-4 h-4 rotate-45 cursor-grab border-2" style={{ left: x(b.fin) + px / 2 - 8, top: top + 2, background: c, borderColor: venc ? "#ff5370" : "#f0f4ff" }}
                      title={t.titulo} />
                  );
                }
                return (
                  <div key={t.id} className={cn("absolute z-[3] rounded-md cursor-grab active:cursor-grabbing overflow-hidden group", venc && "ring-1 ring-red-400")}
                    style={{ left: x(b.ini), width: Math.max((b.fin - b.ini + 1) * px, 6), top, height: FILA - 14, background: `${c}40`, border: `1px solid ${c}` }}
                    onPointerDown={(e) => iniciar(e, t, "mover")} title={`${t.titulo} · ${aISO(b.ini)} → ${aISO(b.fin)} · ${t.progreso}%`}>
                    <div className="absolute inset-y-0 left-0" style={{ width: `${t.progreso}%`, background: `${c}80` }} />
                    {(b.fin - b.ini + 1) * px > 60 && <span className="relative px-1.5 text-[10px] leading-5 whitespace-nowrap">{t.titulo}</span>}
                    <span className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40" onPointerDown={(e) => iniciar(e, t, "inicio")} aria-hidden />
                    <span className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40" onPointerDown={(e) => iniciar(e, t, "fin")} aria-hidden />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sinFechas.length > 0 && (
        <details className="rounded-lg border border-glass-bd px-3 py-2">
          <summary className="text-xs text-silver cursor-pointer">{sinFechas.length} actividad(es) sin fechas</summary>
          <ul className="mt-2 space-y-1">
            {sinFechas.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <button className="flex-1 text-left truncate hover:text-cyan" onClick={() => abrir(t.id)}>{t.titulo}</button>
                <Button variant="outline" size="sm" className="h-7" onClick={() => {
                  const dias = Math.max(0, Math.ceil((t.duracion_estimada ?? 8) / 8) - 1);
                  actualizar(t.id, { inicio: h, fin: aISO(hoyN + dias) });
                }}>Programar desde hoy</Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
