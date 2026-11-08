"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban, FolderCheck, FolderClock, ListTodo, TrendingDown, TrendingUp, Users } from "lucide-react";
import { api, useGestion } from "@/components/management/contexto";
import { TableroWidgets } from "@/components/management/Widgets";
import { Cargando, Chip, ErrorCaja, Indicador, Tarjeta, Vacio, fmtFecha, fmtMonto } from "@/components/management/ui";
import { ESTADOS_TAREA, ETAPAS_PROYECTO, PRIORIDADES, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";

type T = { id: string; titulo: string; fin: string | null; estado: string; prioridad: string; responsable: { nombre: string; apellido: string } | null; proyecto: { codigo: string } | null };
type Resumen = {
  hoy: string; limite: string;
  personal: { actividades: T[]; completadas30: number; proyectos: { id: string; codigo: string; nombre: string; etapa: string; avance: number | null }[] } | null;
  empresa: {
    empleados: number; proyectosActivos: number; proyectosPendientes: number; proyectosCulminados: number;
    vencidas: { total: number; lista: T[] }; proximas: { total: number; lista: T[] };
    finanzas: { ingresos: number; gastos: number; porCobrar: number; vencidoCobrar: number } | null;
    departamentos: { id: string; nombre: string; abiertas: number; vencidas: number; bloqueadas: number }[];
    alertas: string[];
  } | null;
};

function ListaTareas({ lista, hoy }: { lista: T[]; hoy: string }) {
  if (!lista.length) return <Vacio texto="Nada pendiente aquí." />;
  return (
    <ul className="divide-y divide-glass-bd/60">
      {lista.map((t) => (
        <li key={t.id}>
          <Link href={`/dashboard/planificacion?tarea=${t.id}`} className="flex items-center gap-3 py-2 hover:bg-white/[0.03] rounded px-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color(PRIORIDADES, t.prioridad) }} title={etiqueta(PRIORIDADES, t.prioridad)} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm truncate">{t.titulo}</span>
              <span className="block text-[11px] text-silver/70 truncate">{t.proyecto?.codigo ?? "Sin proyecto"} · {nombreEmpleado(t.responsable)}</span>
            </span>
            <span className={`text-xs tabular-nums ${t.fin && t.fin < hoy ? "text-red-300" : "text-silver"}`}>{fmtFecha(t.fin)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardGestion() {
  const { sesion } = useGestion();
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Resumen>("/api/gestion/resumen").then(setR).catch((e) => setError(e.message)); }, []);

  if (error) return <ErrorCaja texto={error} />;
  if (!r) return <Cargando />;
  const e = r.empresa;
  const nombre = sesion?.empleado?.nombre ?? sesion?.nombre?.split(" ")[0] ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-ui font-bold text-xl sm:text-2xl">Tablero general{nombre ? ` · ${nombre}` : ""}</h1>
        <p className="text-sm text-silver">Resumen al {fmtFecha(r.hoy)}. Próximos vencimientos hasta el {fmtFecha(r.limite)}.</p>
      </div>

      {e && e.alertas.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 sm:p-4">
          <p className="flex items-center gap-2 text-sm font-ui font-semibold text-amber-200 mb-1.5"><AlertTriangle className="w-4 h-4" />Alertas</p>
          <ul className="text-sm text-amber-100/90 list-disc pl-5 space-y-0.5">{e.alertas.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      {e && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Indicador titulo="Empleados activos" valor={e.empleados} icono={Users} />
          <Indicador titulo="Proyectos activos" valor={e.proyectosActivos} icono={FolderKanban} color="#00cfff" />
          <Indicador titulo="Proyectos pendientes" valor={e.proyectosPendientes} icono={FolderClock} color="#ffb300" />
          <Indicador titulo="Proyectos culminados" valor={e.proyectosCulminados} icono={FolderCheck} color="#00e676" />
          <Indicador titulo="Actividades vencidas" valor={e.vencidas.total} icono={AlertTriangle} color="#ff5370" />
          <Indicador titulo="Próximos vencimientos" valor={e.proximas.total} icono={CalendarClock} color="#b388ff" />
          {e.finanzas && <>
            <Indicador titulo="Ingresos del mes" valor={fmtMonto(e.finanzas.ingresos)} icono={TrendingUp} color="#00e676" />
            <Indicador titulo="Gastos del mes" valor={fmtMonto(e.finanzas.gastos)} icono={TrendingDown} color="#ff5370"
              detalle={`Por cobrar: ${fmtMonto(e.finanzas.porCobrar)}`} />
          </>}
        </div>
      )}

      <TableroWidgets />

      {r.personal && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Tarjeta titulo="Mis actividades" className="lg:col-span-2" accion={<Link href="/dashboard/planificacion?mias=1" className="text-xs text-blue-accent hover:underline">Ver todas</Link>}>
            <ListaTareas lista={r.personal.actividades} hoy={r.hoy} />
          </Tarjeta>
          <div className="space-y-4">
            <Indicador titulo="Completadas (30 días)" valor={r.personal.completadas30} icono={CheckCircle2} color="#00e676" />
            <Tarjeta titulo="Mis proyectos">
              {!r.personal.proyectos.length ? <Vacio texto="No formas parte de ningún equipo de proyecto." /> : (
                <ul className="space-y-2">
                  {r.personal.proyectos.map((p) => (
                    <li key={p.id}>
                      <Link href={`/dashboard/proyectos/${p.id}`} className="block hover:bg-white/[0.03] rounded p-1">
                        <span className="text-sm">{p.codigo} · {p.nombre}</span>
                        <span className="flex items-center gap-2 text-[11px] text-silver mt-1">
                          {etiqueta(ETAPAS_PROYECTO, p.etapa)}
                          <span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-cyan" style={{ width: `${p.avance ?? 0}%` }} /></span>
                          <span translate="no">{p.avance ?? 0}%</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </div>
      )}

      {e && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Tarjeta titulo="Actividades vencidas"><ListaTareas lista={e.vencidas.lista} hoy={r.hoy} /></Tarjeta>
          <Tarjeta titulo="Próximos vencimientos"><ListaTareas lista={e.proximas.lista} hoy={r.hoy} /></Tarjeta>
        </div>
      )}

      {e && e.departamentos.length > 0 && (
        <Tarjeta titulo="Estado de departamentos">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {e.departamentos.map((d) => {
              const salud = d.vencidas || d.bloqueadas ? (d.vencidas > 3 || d.bloqueadas > 2 ? "#ff5370" : "#ffb300") : "#00e676";
              return (
                <div key={d.id} className="rounded-lg border border-glass-bd p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-ui">{d.nombre}</span><span className="w-2.5 h-2.5 rounded-full" style={{ background: salud }} /></div>
                  <div className="flex flex-wrap gap-1.5 mt-2" translate="no">
                    <Chip texto={`${d.abiertas} abiertas`} color={color(ESTADOS_TAREA, "en_progreso")} />
                    <Chip texto={`${d.vencidas} vencidas`} color="#ff5370" />
                    <Chip texto={`${d.bloqueadas} bloqueadas`} color={color(ESTADOS_TAREA, "bloqueada")} />
                  </div>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      )}

      {!r.personal && !e && <Vacio texto="Tu cuenta de administrador no tiene expediente de empleado; usa los módulos del menú." />}
      {!r.personal && e && <p className="text-xs text-silver/60 flex items-center gap-1.5"><ListTodo className="w-3.5 h-3.5" />Tu cuenta no tiene expediente de empleado, por eso no ves «Mis actividades».</p>}
    </div>
  );
}
