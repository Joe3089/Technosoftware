"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, useGestion } from "@/components/management/contexto";
import { SelectorRef, campoCls, hoy } from "@/components/management/ui";
import { etqEmpleado, type Tarea } from "./comun";

/**
 * Alta rápida estilo Trello al pie de una columna: título, a quién se asigna (el consultor puede asignar
 * a programadores de DevOps o a sí mismo), horas estimadas y fechas. Aparece en el tablero y en el Gantt.
 */
export function TarjetaRapida({ estado, proyectoId, onCreada }: { estado: string; proyectoId: string | null; onCreada: (t: Tarea) => void }) {
  const { sesion, avisar } = useGestion();
  const [abierta, setAbierta] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [resp, setResp] = useState<{ id: string | null; depto: string | null; nombre: string | null }>({ id: null, depto: null, nombre: null });
  const [horas, setHoras] = useState("");
  const [inicio, setInicio] = useState(hoy());
  const [fin, setFin] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const abrir = () => {
    setResp({ id: sesion?.empleado_id ?? null, depto: sesion?.empleado?.departamento_id ?? null,
      nombre: sesion?.empleado ? `${sesion.empleado.nombre} ${sesion.empleado.apellido}` : null });
    setAbierta(true);
  };

  async function crear() {
    if (!titulo.trim()) return;
    if (fin && inicio && fin < inicio) return avisar("La fecha de fin no puede ser anterior al inicio", "error");
    setOcupado(true);
    try {
      const r = await api<{ dato: Tarea }>("/api/gestion/tareas", { method: "POST", json: {
        titulo: titulo.trim(), estado, proyecto_id: proyectoId, responsable_id: resp.id, departamento_id: resp.depto,
        duracion_estimada: horas ? Number(horas) : null, inicio: inicio || null, fin: fin || inicio || null, prioridad: "media",
      } });
      onCreada(r.dato);
      setTitulo(""); setHoras(""); setFin("");
      avisar(`Tarjeta creada${resp.nombre ? ` para ${resp.nombre}` : ""}`);
    } catch (e) { avisar(e instanceof Error ? e.message : "No se pudo crear", "error"); }
    finally { setOcupado(false); }
  }

  if (!abierta) return (
    <button onClick={abrir} className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-silver hover:text-white hover:bg-white/5">
      <Plus className="w-3.5 h-3.5" />Añadir tarjeta
    </button>
  );
  return (
    <div className="rounded-lg border border-blue-accent/40 bg-navy-mid/70 p-2 space-y-2">
      <textarea autoFocus rows={2} className={campoCls} placeholder="¿Qué hay que hacer?" value={titulo} onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); crear(); } if (e.key === "Escape") setAbierta(false); }} />
      <div>
        <span className="text-[10px] text-silver">Asignar a</span>
        <SelectorRef recurso="empleados" value={resp.id} inicial={resp.nombre} filtros={{ estado: "activo" }} etiqueta={etqEmpleado} placeholder="Sin asignar"
          onChange={(id, f) => setResp({ id, depto: (f?.departamento_id as string | null) ?? null, nombre: f ? etqEmpleado(f) : null })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <label className="text-[10px] text-silver">Horas<input type="number" min={0} step={0.5} className={campoCls} value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="8" /></label>
        <label className="text-[10px] text-silver">Inicio<input type="date" className={campoCls} value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label className="text-[10px] text-silver">Fin<input type="date" className={campoCls} value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} /></label>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8" disabled={ocupado || !titulo.trim()} onClick={crear}>{ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Añadir</Button>
        <button onClick={() => setAbierta(false)} className="p-1 text-silver hover:text-white" aria-label="Cancelar"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
