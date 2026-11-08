"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Columns3, GanttChart, List, Plus, Settings2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { Formulario } from "@/components/management/Formulario";
import { Buscador, Cargando, Chip, ErrorCaja, Modal, Selector, SelectorRef, campoCls, fmtFecha, hoy } from "@/components/management/ui";
import { ESTADOS_TAREA, PRIORIDADES, ROLES_SISTEMA, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { CAMPOS_TAREA, etqDepto, etqEmpleado, vencida, type Actualizar, type Tarea } from "@/components/planning/comun";
import { DetalleTarea } from "@/components/planning/DetalleTarea";
import { TarjetaRapida } from "@/components/planning/TarjetaRapida";
import { VistaGantt } from "@/components/gantt/Gantt";
import { VistaCalendario } from "@/components/planning/Calendario";

type Vista = "lista" | "kanban" | "gantt" | "calendario";
const VISTAS: [Vista, string, React.ElementType][] = [["lista", "Lista", List], ["kanban", "Tablero", Columns3], ["gantt", "Gantt", GanttChart], ["calendario", "Calendario", CalendarDays]];
const LIMITE = 200;

/** Planificación: las cuatro vistas comparten el mismo conjunto de registros y cada cambio se persiste en Supabase. */
export default function Actividades({ proyectoId }: { proyectoId?: string }) {
  const { sesion, avisar } = useGestion();
  const router = useRouter();
  const sp = useSearchParams();
  const [vista, setVista] = useState<Vista>("kanban");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [depto, setDepto] = useState<string | null>(null);
  const [resp, setResp] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [subtareas, setSubtareas] = useState(false);
  const [proyecto, setProyecto] = useState<string | null>(proyectoId ?? null);
  const [nueva, setNueva] = useState<Partial<Tarea> | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => { const v = localStorage.getItem("gestion.vista") as Vista | null; if (v && VISTAS.some(([k]) => k === v)) setVista(v); }, []);
  const cambiarVista = (v: Vista) => { setVista(v); localStorage.setItem("gestion.vista", v); };
  useEffect(() => {
    if (sp.get("tarea")) setAbierta(sp.get("tarea"));
    if (sp.get("mias") && sesion?.empleado_id) setResp(sesion.empleado_id);
  }, [sp, sesion?.empleado_id]);

  const params: Record<string, string | number> = { size: LIMITE, q, orden: "orden" };
  if (estado) params["f.estado"] = estado;
  if (prioridad) params["f.prioridad"] = prioridad;
  if (depto) params["f.departamento_id"] = depto;
  if (resp) params["f.responsable_id"] = resp;
  if (proyecto) params["f.proyecto_id"] = proyecto;
  if (!subtareas) params["f.padre_id"] = "null";
  if (desde || hasta) params["r.fin"] = `${desde}..${hasta}`;
  const { datos, total, cargando, error, recargar, setDatos } = useLista<Tarea>("tareas", params);

  const actualizar: Actualizar = useCallback(async (id, cambios) => {
    let previo: Tarea | undefined;
    setDatos((d) => d.map((t) => (t.id === id ? ((previo = t), { ...t, ...cambios }) : t)));
    try {
      const r = await api<{ dato: Tarea }>(`/api/gestion/tareas/${id}`, { method: "PATCH", json: cambios });
      setDatos((d) => d.map((t) => (t.id === id ? { ...t, ...r.dato } : t)));
      return true;
    } catch (e) {
      setDatos((d) => d.map((t) => (t.id === id && previo ? previo : t)));
      avisar(e instanceof Error ? e.message : "No se pudo guardar", "error");
      return false;
    }
  }, [setDatos, avisar]);

  const cerrarDetalle = useCallback(() => {
    setAbierta(null);
    if (sp.get("tarea")) router.replace(proyectoId ? `/dashboard/proyectos/${proyectoId}` : "/dashboard/planificacion");
  }, [sp, router, proyectoId]);

  const nuevaInicial = (extra: Partial<Tarea> = {}): Partial<Tarea> => ({
    prioridad: "media", estado: "por_hacer", responsable_id: sesion?.empleado_id ?? null, proyecto_id: proyecto,
    responsable: sesion?.empleado ? { id: sesion.empleado.id, nombre: sesion.empleado.nombre, apellido: sesion.empleado.apellido } : null,
    departamento_id: sesion?.empleado?.departamento_id ?? null, ...extra,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Vista" className="inline-flex rounded-lg border border-glass-bd p-0.5">
          {VISTAS.map(([k, t, I]) => (
            <button key={k} role="tab" aria-selected={vista === k} onClick={() => cambiarVista(k)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-ui", vista === k ? "bg-blue-accent/20 text-white" : "text-silver hover:text-white")}>
              <I className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t}</span>
            </button>
          ))}
        </div>
        {sesion?.empleado_id && (
          <Button variant={resp === sesion.empleado_id ? "default" : "outline"} size="sm" onClick={() => setResp((r) => (r === sesion.empleado_id ? null : sesion.empleado_id))}>
            <UserRound className="w-3.5 h-3.5" />Mías
          </Button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setNueva(nuevaInicial())}><Plus className="w-4 h-4" />Nueva actividad</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {!proyectoId && <SelectorRef recurso="proyectos" value={proyecto} onChange={setProyecto} etiqueta={(f) => `${f.codigo} · ${f.nombre}`} placeholder="Todos los proyectos" />}
        <Buscador valor={q} onCambio={setQ} className={proyectoId ? "col-span-2" : ""} placeholder="Buscar actividad…" />
        <Selector value={estado} onChange={setEstado} opciones={ESTADOS_TAREA} vacio="Todos los estados" aria-label="Estado" />
        <Selector value={prioridad} onChange={setPrioridad} opciones={PRIORIDADES} vacio="Toda prioridad" aria-label="Prioridad" />
        <SelectorRef recurso="departamentos" value={depto} onChange={setDepto} etiqueta={etqDepto} placeholder="Departamento" />
        <SelectorRef recurso="empleados" value={resp} onChange={setResp} etiqueta={etqEmpleado} placeholder="Responsable" filtros={{ estado: "activo" }} />
        <input type="date" className={campoCls} value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Vence desde" title="Vence desde" />
        <input type="date" className={campoCls} value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Vence hasta" title="Vence hasta" />
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-silver"><input type="checkbox" className="accent-[#4d7fff]" checked={subtareas} onChange={(e) => setSubtareas(e.target.checked)} />Incluir subtareas</label>
      {total > LIMITE && <p className="text-xs text-amber-200">Mostrando {LIMITE} de {total}. Usa los filtros para acotar.</p>}

      {error ? <ErrorCaja texto={error} /> : cargando && !datos.length ? <Cargando /> : (
        <div className={cn(cargando && "opacity-70 transition-opacity")}>
          {vista === "lista" && <VistaLista tareas={datos} actualizar={actualizar} abrir={setAbierta} />}
          {vista === "kanban" && <VistaKanban tareas={datos} actualizar={actualizar} abrir={setAbierta} proyecto={proyecto} creada={(t) => setDatos((d) => [...d, t])} />}
          {vista === "gantt" && <VistaGantt tareas={datos} actualizar={actualizar} abrir={setAbierta} />}
          {vista === "calendario" && <VistaCalendario tareas={datos} actualizar={actualizar} abrir={setAbierta} nueva={(d) => setNueva(nuevaInicial({ inicio: d, fin: d }))} />}
        </div>
      )}

      <Modal abierto={!!nueva} onCerrar={() => setNueva(null)} titulo="Nueva actividad">
        <Formulario campos={CAMPOS_TAREA} inicial={nueva as Record<string, unknown>} textoGuardar="Crear"
          onCancelar={() => setNueva(null)}
          onGuardar={async (d) => {
            await api("/api/gestion/tareas", { method: "POST", json: d });
            setNueva(null); avisar("Actividad creada"); recargar();
          }} />
      </Modal>
      <DetalleTarea id={abierta} onCerrar={cerrarDetalle} onCambio={recargar} />
    </div>
  );
}

// ── Lista ────────────────────────────────────────────────────────────
const COLUMNAS: { k: string; t: string; v: (t: Tarea) => React.ReactNode; s?: (t: Tarea) => string | number }[] = [
  { k: "estado", t: "Estado", v: (t) => <Chip texto={etiqueta(ESTADOS_TAREA, t.estado)} color={color(ESTADOS_TAREA, t.estado)} />, s: (t) => ESTADOS_TAREA.findIndex((e) => e.valor === t.estado) },
  { k: "prioridad", t: "Prioridad", v: (t) => <Chip texto={etiqueta(PRIORIDADES, t.prioridad)} color={color(PRIORIDADES, t.prioridad)} />, s: (t) => PRIORIDADES.findIndex((e) => e.valor === t.prioridad) },
  { k: "responsable", t: "Responsable", v: (t) => nombreEmpleado(t.responsable), s: (t) => nombreEmpleado(t.responsable) },
  { k: "proyecto", t: "Proyecto", v: (t) => t.proyecto?.codigo ?? "—", s: (t) => t.proyecto?.codigo ?? "" },
  { k: "departamento", t: "Departamento", v: (t) => t.departamento?.nombre ?? "—", s: (t) => t.departamento?.nombre ?? "" },
  { k: "inicio", t: "Inicio", v: (t) => fmtFecha(t.inicio), s: (t) => t.inicio ?? "9999" },
  { k: "fin", t: "Finalización", v: (t) => fmtFecha(t.fin), s: (t) => t.fin ?? "9999" },
  { k: "progreso", t: "Progreso", v: (t) => <span translate="no">{t.progreso}%</span>, s: (t) => t.progreso },
  { k: "duracion", t: "Estimado (h)", v: (t) => t.duracion_estimada ?? "—", s: (t) => t.duracion_estimada ?? 0 },
  { k: "real", t: "Real (h)", v: (t) => t.tiempo_real, s: (t) => t.tiempo_real },
];
const AGRUPAR: Record<string, (t: Tarea) => string> = {
  estado: (t) => etiqueta(ESTADOS_TAREA, t.estado), prioridad: (t) => etiqueta(PRIORIDADES, t.prioridad),
  responsable: (t) => nombreEmpleado(t.responsable), proyecto: (t) => t.proyecto ? `${t.proyecto.codigo} · ${t.proyecto.nombre}` : "Sin proyecto",
  departamento: (t) => t.departamento?.nombre ?? "Sin departamento",
};

function VistaLista({ tareas, actualizar, abrir }: { tareas: Tarea[]; actualizar: Actualizar; abrir: (id: string) => void }) {
  const [visibles, setVisibles] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("gestion.columnas") ?? "") as string[]; }
    catch { return ["estado", "prioridad", "responsable", "proyecto", "fin", "progreso"]; }
  });
  const [orden, setOrden] = useState<{ k: string; asc: boolean } | null>(null);
  const [grupo, setGrupo] = useState("");
  const [config, setConfig] = useState(false);
  useEffect(() => { localStorage.setItem("gestion.columnas", JSON.stringify(visibles)); }, [visibles]);
  const h = hoy();
  const cols = COLUMNAS.filter((c) => visibles.includes(c.k));

  const ordenadas = useMemo(() => {
    if (!orden) return tareas;
    const c = COLUMNAS.find((x) => x.k === orden.k);
    return [...tareas].sort((a, b) => { const x = c?.s?.(a) ?? 0, y = c?.s?.(b) ?? 0; return (x < y ? -1 : x > y ? 1 : 0) * (orden.asc ? 1 : -1); });
  }, [tareas, orden]);
  const grupos = useMemo(() => {
    if (!grupo) return [["", ordenadas]] as [string, Tarea[]][];
    const m = new Map<string, Tarea[]>();
    for (const t of ordenadas) { const g = AGRUPAR[grupo](t); m.set(g, [...(m.get(g) ?? []), t]); }
    return [...m.entries()];
  }, [ordenadas, grupo]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Selector className="w-auto" value={grupo} onChange={setGrupo} vacio="Sin agrupar" aria-label="Agrupar por"
          opciones={Object.keys(AGRUPAR).map((k) => ({ valor: k, etiqueta: `Agrupar por ${COLUMNAS.find((c) => c.k === k)?.t.toLowerCase() ?? k}` }))} />
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setConfig((c) => !c)} aria-expanded={config}><Settings2 className="w-3.5 h-3.5" />Columnas</Button>
          {config && (
            <div className="absolute z-30 mt-1 w-48 rounded-lg border border-glass-bd bg-[#0b1430] p-2 space-y-1 shadow-glass">
              {COLUMNAS.map((c) => (
                <label key={c.k} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="accent-[#4d7fff]" checked={visibles.includes(c.k)}
                    onChange={(e) => setVisibles((v) => (e.target.checked ? [...v, c.k] : v.filter((x) => x !== c.k)))} />{c.t}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {!tareas.length ? <p className="text-sm text-silver/60 py-8 text-center">No hay actividades con estos filtros.</p> : (
        <div className="overflow-x-auto rounded-xl border border-glass-bd">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-silver text-xs">
              <tr>
                {[{ k: "titulo", t: "Actividad" }, ...cols].map((c) => (
                  <th key={c.k} className="text-left font-ui font-semibold px-3 py-2 whitespace-nowrap">
                    <button className="hover:text-white" onClick={() => setOrden((o) => ({ k: c.k, asc: o?.k === c.k ? !o.asc : true }))}>
                      {c.t}{orden?.k === c.k ? (orden.asc ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            {grupos.map(([g, filas]) => (
              <tbody key={g}>
                {g && <tr className="bg-blue-accent/5"><td colSpan={cols.length + 1} className="px-3 py-1.5 text-xs font-ui text-cyan">{g} <span className="text-silver/60">({filas.length})</span></td></tr>}
                {filas.map((t) => (
                  <tr key={t.id} className="border-t border-glass-bd/60 hover:bg-white/[0.03] cursor-pointer" onClick={() => abrir(t.id)}>
                    <td className="px-3 py-2 min-w-[220px]">
                      <span className={cn("font-medium", t.estado === "completada" && "line-through text-silver/60")}>{t.es_hito && "◆ "}{t.titulo}</span>
                      {vencida(t, h) && <span className="ml-2 text-[10px] text-red-300 uppercase">vencida</span>}
                    </td>
                    {cols.map((c) => (
                      <td key={c.k} className="px-3 py-2 whitespace-nowrap" onClick={c.k === "estado" ? (e) => e.stopPropagation() : undefined}>
                        {c.k === "estado" ? (
                          <select value={t.estado} onChange={(e) => actualizar(t.id, { estado: e.target.value })} aria-label="Cambiar estado"
                            className="bg-transparent text-xs rounded border border-glass-bd px-1 py-0.5 [color-scheme:dark]" style={{ color: color(ESTADOS_TAREA, t.estado) }}>
                            {ESTADOS_TAREA.map((e) => <option key={e.valor} value={e.valor} className="bg-[#0b1430] text-white">{e.etiqueta}</option>)}
                          </select>
                        ) : c.v(t)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

// ── Kanban ───────────────────────────────────────────────────────────
function VistaKanban({ tareas, actualizar, abrir, proyecto, creada }: { tareas: Tarea[]; actualizar: Actualizar; abrir: (id: string) => void; proyecto: string | null; creada: (t: Tarea) => void }) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<{ estado: string; antes: string | null } | null>(null);
  const h = hoy();
  const columnas = useMemo(() => ESTADOS_TAREA.map((e) => ({ ...e, tareas: tareas.filter((t) => t.estado === e.valor).sort((a, b) => a.orden - b.orden) })), [tareas]);

  function soltar(estado: string, antes: string | null) {
    const id = arrastrando;
    setArrastrando(null); setDestino(null);
    if (!id) return;
    const col = columnas.find((c) => c.valor === estado)!.tareas.filter((t) => t.id !== id);
    const i = antes ? col.findIndex((t) => t.id === antes) : col.length;
    const prev = col[i - 1]?.orden, next = col[i]?.orden;
    const orden = prev != null && next != null ? (prev + next) / 2 : next != null ? next - 1 : prev != null ? prev + 1 : Date.now() / 1000;
    const t = tareas.find((x) => x.id === id);
    if (t && (t.estado !== estado || t.orden !== orden)) actualizar(id, { estado, orden });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
      {columnas.map((c) => (
        <section key={c.valor} aria-label={c.etiqueta}
          className={cn("w-72 shrink-0 snap-start rounded-xl border bg-white/[0.02] flex flex-col max-h-[70vh]", destino?.estado === c.valor ? "border-blue-accent/60" : "border-glass-bd")}
          onDragOver={(e) => { e.preventDefault(); if (destino?.estado !== c.valor || destino.antes) setDestino({ estado: c.valor, antes: null }); }}
          onDrop={(e) => { e.preventDefault(); soltar(c.valor, destino?.estado === c.valor ? destino.antes : null); }}>
          <header className="flex items-center gap-2 px-3 py-2 border-b border-glass-bd">
            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
            <span className="text-sm font-ui font-semibold">{c.etiqueta}</span>
            <span className="text-xs text-silver/60" translate="no">{c.tareas.length}</span>
          </header>
          <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[80px]">
            {c.tareas.map((t) => (
              <div key={t.id}>
                {destino?.estado === c.valor && destino.antes === t.id && <div className="h-1 rounded bg-blue-accent mb-2" />}
                <article draggable onDragStart={(e) => { setArrastrando(t.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); }}
                  onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (destino?.antes !== t.id) setDestino({ estado: c.valor, antes: t.id }); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); soltar(c.valor, t.id); }}
                  onClick={() => abrir(t.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && abrir(t.id)}
                  className={cn("rounded-lg border border-glass-bd bg-navy-mid/60 p-2.5 cursor-grab active:cursor-grabbing hover:border-blue-accent/50 space-y-1.5", arrastrando === t.id && "opacity-40")}>
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: color(PRIORIDADES, t.prioridad) }} title={etiqueta(PRIORIDADES, t.prioridad)} />
                    <p className="text-sm leading-snug flex-1">{t.es_hito && "◆ "}{t.titulo}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-silver" translate="no">
                    {t.proyecto && <span className="rounded bg-cyan/10 text-cyan px-1.5 py-0.5">{t.proyecto.codigo}</span>}
                    {t.duracion_estimada != null && <span className="rounded bg-white/5 px-1.5 py-0.5" title="Horas estimadas">⏱ {t.duracion_estimada} h{t.tiempo_real ? ` · real ${t.tiempo_real} h` : ""}</span>}
                    {(t.inicio || t.fin) && <span className={cn("rounded px-1.5 py-0.5", vencida(t, h) ? "bg-red-500/15 text-red-300" : "bg-white/5")}>
                      {t.inicio && t.fin && t.inicio !== t.fin ? `${fmtFecha(t.inicio).slice(0, 6)} → ${fmtFecha(t.fin).slice(0, 6)}` : fmtFecha(t.fin ?? t.inicio)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.responsable ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-silver min-w-0">
                        <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold text-navy-deep shrink-0"
                          style={{ background: color(ROLES_SISTEMA, (t.responsable as { rol_sistema?: string }).rol_sistema) }} translate="no">
                          {t.responsable.nombre[0]}{t.responsable.apellido?.[0] ?? ""}</span>
                        <span className="truncate">{nombreEmpleado(t.responsable)}</span>
                      </span>
                    ) : <span className="text-[11px] text-amber-200/80">Sin asignar</span>}
                  </div>
                  {t.progreso > 0 && t.estado !== "completada" && <div className="h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-cyan" style={{ width: `${t.progreso}%` }} /></div>}
                  {/* Alternativa táctil al arrastre */}
                  <select value={t.estado} onClick={(e) => e.stopPropagation()} onChange={(e) => actualizar(t.id, { estado: e.target.value })} aria-label="Mover a"
                    className="md:hidden w-full bg-transparent text-[11px] rounded border border-glass-bd px-1 py-0.5 text-silver [color-scheme:dark]">
                    {ESTADOS_TAREA.map((e) => <option key={e.valor} value={e.valor} className="bg-[#0b1430]">{e.etiqueta}</option>)}
                  </select>
                </article>
              </div>
            ))}
            {destino?.estado === c.valor && !destino.antes && arrastrando && <div className="h-1 rounded bg-blue-accent" />}
          </div>
          {!["completada", "cancelada"].includes(c.valor) && <div className="p-2 border-t border-glass-bd"><TarjetaRapida estado={c.valor} proyectoId={proyecto} onCreada={creada} /></div>}
        </section>
      ))}
    </div>
  );
}
