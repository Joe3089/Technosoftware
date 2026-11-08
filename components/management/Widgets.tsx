"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "./contexto";
import { Cargando, ErrorCaja, SelectorRef, Buscador, fmtMonto, hoy } from "./ui";
import { ESTADOS_PROYECTO, ETAPAS_PROYECTO, ROLES_SISTEMA, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";

type Proyecto = { id: string; codigo: string; nombre: string; estado: string; etapa: string; avance: number | null;
  inicio_plan: string | null; fin_plan: string | null; fecha_inicio: string | null; fecha_fin: string | null };
type Datos = {
  proyectos: Proyecto[]; estados: Record<string, number>;
  carga: { semanas: string[]; filas: { empleado: { id: string; nombre: string; apellido: string; rol_sistema: string }; celdas: { n: number; horas: number }[] }[] };
  presupuesto: { id: string; codigo: string; nombre: string; moneda: string; presupuesto: number; gastos: number }[] | null;
};

/** Tablero general (estilo monday.com): filtros + 4 widgets ampliables. */
export function TableroWidgets() {
  const [q, setQ] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [depto, setDepto] = useState<string | null>(null);
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ampliado, setAmpliado] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Tiempo real: cualquier cambio del equipo refresca los widgets (agrupado cada 2 s)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const h = () => { if (t) clearTimeout(t); t = setTimeout(() => setTick((x) => x + 1), 2000); };
    window.addEventListener("gestion:cambio", h);
    return () => { window.removeEventListener("gestion:cambio", h); if (t) clearTimeout(t); };
  }, []);

  useEffect(() => {
    const p = new URLSearchParams({ semanas: "10" });
    if (persona) p.set("persona", persona);
    if (depto) p.set("depto", depto);
    api<Datos>(`/api/gestion/tablero?${p}`).then(setD).catch((e) => setError(e.message));
  }, [persona, depto, tick]);

  const texto = q.trim().toLowerCase();
  const proyectos = useMemo(() => (d?.proyectos ?? []).filter((p) => !texto || `${p.codigo} ${p.nombre}`.toLowerCase().includes(texto)), [d, texto]);
  const filas = useMemo(() => (d?.carga.filas ?? []).filter((f) => !texto || nombreEmpleado(f.empleado).toLowerCase().includes(texto) || proyectos.length > 0), [d, texto, proyectos]);

  const widget = (id: string, titulo: string, cuerpo: React.ReactNode, clase = "", extra?: React.ReactNode) => (
    <section className={cn("glass-card rounded-xl flex flex-col min-h-[320px]", ampliado === id ? "lg:col-span-2 min-h-[480px]" : clase, ampliado && ampliado !== id && "hidden")}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-glass-bd">
        <h2 className="font-ui font-semibold text-sm flex-1">{titulo}</h2>
        {extra}
        <button className="p-1 text-silver hover:text-white" onClick={() => setAmpliado(ampliado === id ? null : id)} aria-label={ampliado === id ? "Reducir" : "Ampliar"}>
          {ampliado === id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </header>
      <div className="flex-1 min-h-0 p-3">{cuerpo}</div>
    </section>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-glass-bd bg-white/[0.02] p-2">
        <Buscador valor={q} onCambio={setQ} placeholder="Filtrar proyectos o personas…" className="flex-1 min-w-[180px]" />
        <div className="w-48"><SelectorRef recurso="empleados" value={persona} onChange={setPersona} etiqueta={etqEmpleado} filtros={{ estado: "activo" }} placeholder="Persona" /></div>
        <div className="w-48"><SelectorRef recurso="departamentos" value={depto} onChange={setDepto} etiqueta={etqDepto} placeholder="Departamento" /></div>
      </div>
      {error ? <ErrorCaja texto={error} /> : !d ? <Cargando /> : (
        <div className="grid lg:grid-cols-2 gap-3">
          {widget("timeline", "Línea de tiempo de proyectos", <LineaTiempo proyectos={proyectos} />)}
          {widget("estado", "Estado de los proyectos", <Dona estados={d.estados} />)}
          {widget("carga", "Carga de trabajo", <Carga semanas={d.carga.semanas} filas={filas} />)}
          {widget("presupuesto", "Presupuesto vs gastos", d.presupuesto ? <Presupuesto datos={d.presupuesto.filter((p) => !texto || `${p.codigo} ${p.nombre}`.toLowerCase().includes(texto))} />
            : <p className="text-xs text-silver/60 p-4">Requiere permiso de Finanzas.</p>)}
        </div>
      )}
    </div>
  );
}

// ── Línea de tiempo: proyectos agrupados por estado, escala por meses ─
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function LineaTiempo({ proyectos }: { proyectos: Proyecto[] }) {
  const [zoom, setZoom] = useState(1); // px por día
  const conFechas = proyectos.filter((p) => (p.inicio_plan ?? p.fecha_inicio) && (p.fin_plan ?? p.fecha_fin ?? p.inicio_plan));
  const sinFechas = proyectos.length - conFechas.length;
  const t = (s: string) => Date.parse(`${s}T00:00:00Z`) / 864e5;
  const ini = (p: Proyecto) => t((p.inicio_plan ?? p.fecha_inicio)!);
  const fin = (p: Proyecto) => Math.max(ini(p), t((p.fin_plan ?? p.fecha_fin ?? p.inicio_plan ?? p.fecha_inicio)!));
  const hoyN = t(hoy());
  const min = Math.min(hoyN - 30, ...conFechas.map(ini));
  const base = Date.UTC(new Date(min * 864e5).getUTCFullYear(), new Date(min * 864e5).getUTCMonth(), 1) / 864e5;
  const max = Math.max(hoyN + 120, ...conFechas.map(fin)) + 15;
  const px = 1.4 * zoom;
  const meses: { x: number; txt: string }[] = [];
  for (let m = new Date(base * 864e5); m.getTime() / 864e5 <= max; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))
    meses.push({ x: (m.getTime() / 864e5 - base) * px, txt: `${MESES[m.getUTCMonth()]} ${String(m.getUTCFullYear()).slice(2)}` });
  const grupos = ESTADOS_PROYECTO.map((e) => ({ ...e, lista: conFechas.filter((p) => p.estado === e.valor) })).filter((g) => g.lista.length);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-1 justify-end text-silver">
        <button className="p-1 hover:text-white" onClick={() => setZoom((z) => Math.max(0.5, z / 1.5))} aria-label="Alejar"><Minus className="w-3.5 h-3.5" /></button>
        <button className="p-1 hover:text-white" onClick={() => setZoom((z) => Math.min(6, z * 1.5))} aria-label="Acercar"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      {!grupos.length ? <p className="text-xs text-silver/60">Ningún proyecto tiene fechas planificadas.</p> : (
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-glass-bd">
          <div className="w-28 shrink-0 border-r border-glass-bd">
            <div className="h-7 border-b border-glass-bd" />
            {grupos.map((g) => (
              <div key={g.valor} className="px-2 py-1 text-[11px] font-ui flex items-start gap-1.5 border-b border-glass-bd/50" style={{ height: g.lista.length * 26 + 8 }}>
                <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: g.color }} /><span style={{ color: g.color }}>{g.etiqueta}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            <div className="relative" style={{ width: (max - base) * px }}>
              <div className="sticky top-0 h-7 border-b border-glass-bd bg-navy/80 z-10">
                {meses.map((m) => <span key={m.x} className="absolute top-0 h-full border-l border-glass-bd/60 pl-1 pt-1.5 text-[10px] text-silver whitespace-nowrap" style={{ left: m.x }}>{m.txt}</span>)}
              </div>
              <div className="absolute top-7 bottom-0 w-px bg-cyan/70" style={{ left: (hoyN - base) * px }} title="Hoy" />
              {grupos.map((g) => (
                <div key={g.valor} className="relative border-b border-glass-bd/50" style={{ height: g.lista.length * 26 + 8 }}>
                  {g.lista.map((p, i) => (
                    <Link key={p.id} href={`/dashboard/proyectos/${p.id}`} title={`${p.codigo} · ${p.nombre} · ${etiqueta(ETAPAS_PROYECTO, p.etapa)} · ${p.avance ?? 0}%`}
                      className="absolute h-5 rounded text-[10px] leading-5 px-1.5 truncate text-navy-deep font-semibold hover:brightness-110"
                      style={{ top: 4 + i * 26, left: (ini(p) - base) * px, width: Math.max((fin(p) - ini(p) + 1) * px, 24), background: g.color }}>
                      {p.nombre}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sinFechas > 0 && <p className="text-[10px] text-silver/60">{sinFechas} proyecto(s) sin fechas planificadas.</p>}
    </div>
  );
}

// ── Dona de estados ──────────────────────────────────────────────────
function Dona({ estados }: { estados: Record<string, number> }) {
  const total = Object.values(estados).reduce((s, n) => s + n, 0);
  if (!total) return <p className="text-xs text-silver/60">Aún no hay proyectos.</p>;
  const R = 70, C = 2 * Math.PI * R;
  let acum = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-full">
      <svg viewBox="0 0 200 200" className="w-48 h-48 -rotate-90" role="img" aria-label="Distribución de proyectos por estado">
        {ESTADOS_PROYECTO.filter((e) => estados[e.valor]).map((e) => {
          const parte = (estados[e.valor] / total) * C;
          const el = <circle key={e.valor} cx="100" cy="100" r={R} fill="none" stroke={e.color} strokeWidth="38" strokeDasharray={`${parte} ${C - parte}`} strokeDashoffset={-acum} />;
          acum += parte;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {ESTADOS_PROYECTO.filter((e) => estados[e.valor]).map((e) => (
          <li key={e.valor} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />{e.etiqueta}:
            <span className="text-white" translate="no">{((estados[e.valor] / total) * 100).toFixed(1)}% ({estados[e.valor]})</span></li>
        ))}
      </ul>
    </div>
  );
}

// ── Carga de trabajo: persona × semana; el círculo crece con las horas ─
function Carga({ semanas, filas }: { semanas: string[]; filas: Datos["carga"]["filas"] }) {
  if (!filas.length) return <p className="text-xs text-silver/60">Sin actividades con fechas y responsable en las próximas semanas.</p>;
  const hoyS = hoy();
  return (
    <div className="h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 bg-navy z-10 text-left font-ui text-silver px-2 py-1.5 min-w-[150px]">Persona</th>
              {semanas.map((s, i) => {
                const actual = s <= hoyS && hoyS < (semanas[i + 1] ?? "9999");
                return <th key={s} className={cn("px-1 py-1.5 font-normal whitespace-nowrap min-w-[60px]", actual ? "text-cyan" : "text-silver")} translate="no">
                  S{i + 1}<span className="block text-[9px] text-silver/60">{s.slice(8)}/{s.slice(5, 7)}</span></th>;
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.empleado.id}>
                <td className="sticky left-0 bg-navy z-10 px-2 py-1.5 border-t border-glass-bd/50">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold text-navy-deep shrink-0" style={{ background: color(ROLES_SISTEMA, f.empleado.rol_sistema) }}>
                      {f.empleado.nombre[0]}{f.empleado.apellido?.[0] ?? ""}</span>
                    <span className="leading-tight"><span className="block truncate max-w-[110px]">{nombreEmpleado(f.empleado)}</span>
                      <span className="block text-[10px] text-silver/60">{etiqueta(ROLES_SISTEMA, f.empleado.rol_sistema)}</span></span>
                  </span>
                </td>
                {f.celdas.map((c, i) => {
                  const tam = c.horas ? Math.min(40, 12 + c.horas * 0.7) : 0;
                  const col = c.horas > 40 ? "#ff5370" : c.horas > 30 ? "#ffb300" : "#4d7fff";
                  return (
                    <td key={i} className="border-t border-l border-glass-bd/50 text-center align-middle h-12" title={c.n ? `${c.n} actividad(es) · ${c.horas} h estimadas` : "Libre"}>
                      {c.n > 0 && <span className="inline-grid place-items-center rounded-full text-[9px] font-bold text-white" style={{ width: tam, height: tam, background: col }} translate="no">{Math.round(c.horas)}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-3 text-[10px] text-silver mt-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-accent" />Hasta 30 h</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ffb300]" />30–40 h</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ff5370]" />Sobrecarga (+40 h)</span>
      </p>
    </div>
  );
}

// ── Presupuesto vs gastos por proyecto ───────────────────────────────
function Presupuesto({ datos }: { datos: NonNullable<Datos["presupuesto"]> }) {
  if (!datos.length) return <p className="text-xs text-silver/60">Ningún proyecto tiene presupuesto ni gastos registrados.</p>;
  const max = Math.max(1, ...datos.flatMap((p) => [p.presupuesto, p.gastos]));
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end gap-4 overflow-x-auto pb-1 min-h-[220px]" role="img" aria-label="Presupuesto contra gastos por proyecto">
        {datos.map((p) => (
          <Link key={p.id} href={`/dashboard/proyectos/${p.id}`} className="flex flex-col items-center gap-1 min-w-[64px] h-full justify-end group" title={p.nombre}>
            <div className="flex items-end gap-1 flex-1 w-full justify-center">
              {[["presupuesto", p.presupuesto, "#4d7fff"], ["gastos", p.gastos, p.gastos > p.presupuesto && p.presupuesto ? "#ff5370" : "#ffb300"]].map(([k, v, c]) => (
                <div key={k as string} className="flex flex-col items-center justify-end h-full">
                  <span className="text-[9px] text-silver mb-0.5 whitespace-nowrap" translate="no">{fmtMonto(v as number, p.moneda).replace(/,00$/, "")}</span>
                  <div className="w-5 rounded-t group-hover:brightness-110" style={{ height: `${((v as number) / max) * 100}%`, minHeight: (v as number) ? 2 : 0, background: c as string }} />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-silver truncate max-w-[72px]" translate="no">{p.codigo}</span>
          </Link>
        ))}
      </div>
      <p className="flex gap-3 text-[10px] text-silver mt-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-accent" />Presupuesto</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ffb300]" />Gastos</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ff5370]" />Sobrepasado</span>
      </p>
    </div>
  );
}
