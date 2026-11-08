"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Link2, MessageSquare, Plus, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { Formulario } from "@/components/management/Formulario";
import { Adjuntos } from "@/components/shared/Adjuntos";
import { Historial } from "@/components/shared/Historial";
import { Cargando, Chip, Confirmar, Modal, SelectorRef, campoCls, fmtFechaHora } from "@/components/management/ui";
import { ESTADOS_TAREA, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { CAMPOS_TAREA, etqEmpleado, type Tarea } from "@/components/planning/comun";

type Pestana = "detalle" | "subtareas" | "checklist" | "comentarios" | "archivos" | "relaciones" | "historial";
const PESTANAS: [Pestana, string][] = [["detalle", "Detalle"], ["subtareas", "Subtareas"], ["checklist", "Checklist"], ["comentarios", "Comentarios"],
  ["archivos", "Archivos"], ["relaciones", "Equipo y dependencias"], ["historial", "Historial"]];

export function DetalleTarea({ id, onCerrar, onCambio }: { id: string | null; onCerrar: () => void; onCambio: () => void }) {
  const { intentar, avisar } = useGestion();
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [pestana, setPestana] = useState<Pestana>("detalle");
  const [borrar, setBorrar] = useState(false);

  useEffect(() => {
    setTarea(null); setPestana("detalle");
    if (id) api<{ dato: Tarea }>(`/api/gestion/tareas/${id}`).then((r) => setTarea(r.dato)).catch((e) => { avisar(e.message, "error"); onCerrar(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo recarga al cambiar de actividad
  }, [id]);

  return (
    <Modal abierto={!!id} onCerrar={onCerrar} titulo={tarea?.titulo ?? "Actividad"} ancho="max-w-3xl">
      {!tarea ? <Cargando /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip texto={etiqueta(ESTADOS_TAREA, tarea.estado)} color={color(ESTADOS_TAREA, tarea.estado)} />
            {tarea.proyecto && <span className="text-silver">{tarea.proyecto.codigo} · {tarea.proyecto.nombre}</span>}
            <span className="text-silver/60 ml-auto">Creada {fmtFechaHora(tarea.created_at)}</span>
          </div>
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
            {PESTANAS.map(([k, t]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                className={`px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px ${pestana === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white"}`}>{t}</button>
            ))}
          </div>

          {pestana === "detalle" && (
            <>
              <Formulario campos={CAMPOS_TAREA} inicial={tarea as unknown as Record<string, unknown>} editando textoGuardar="Guardar cambios"
                onCancelar={onCerrar}
                onGuardar={async (d) => {
                  const r = await api<{ dato: Tarea }>(`/api/gestion/tareas/${tarea.id}`, { method: "PATCH", json: d });
                  setTarea(r.dato); onCambio(); avisar("Actividad actualizada");
                }} />
              <div className="border-t border-glass-bd pt-3">
                <Button variant="destructive" size="sm" onClick={() => setBorrar(true)}><Trash2 className="w-3.5 h-3.5" />Eliminar actividad</Button>
              </div>
            </>
          )}
          {pestana === "subtareas" && <Subtareas tarea={tarea} onCambio={onCambio} />}
          {pestana === "checklist" && <Checklist tareaId={tarea.id} />}
          {pestana === "comentarios" && <Comentarios tareaId={tarea.id} />}
          {pestana === "archivos" && <Adjuntos entidad="tarea" entidadId={tarea.id} />}
          {pestana === "relaciones" && <Relaciones tarea={tarea} onCambio={onCambio} />}
          {pestana === "historial" && <Historial entidad="tareas" entidadId={tarea.id} />}
        </div>
      )}
      <Confirmar abierto={borrar} titulo="Eliminar actividad" accion="Eliminar" onCerrar={() => setBorrar(false)}
        texto="La actividad se ocultará de todas las vistas. Su historial, comentarios y archivos se conservan."
        onConfirmar={async () => {
          if (await intentar(() => api(`/api/gestion/tareas/${tarea!.id}`, { method: "DELETE" }), "Actividad eliminada")) { setBorrar(false); onCambio(); onCerrar(); }
        }} />
    </Modal>
  );
}

function Subtareas({ tarea, onCambio }: { tarea: Tarea; onCambio: () => void }) {
  const { intentar } = useGestion();
  const { datos, recargar } = useLista<Tarea>("tareas", { "f.padre_id": tarea.id, size: 100, orden: "created_at" });
  const [nuevo, setNuevo] = useState("");
  const agregar = async () => {
    if (!nuevo.trim()) return;
    const ok = await intentar(() => api("/api/gestion/tareas", { method: "POST", json: {
      titulo: nuevo.trim(), padre_id: tarea.id, proyecto_id: tarea.proyecto_id, departamento_id: tarea.departamento_id,
      responsable_id: tarea.responsable_id, prioridad: tarea.prioridad } }));
    if (ok) { setNuevo(""); recargar(); onCambio(); }
  };
  const alternar = async (s: Tarea) => {
    if (await intentar(() => api(`/api/gestion/tareas/${s.id}`, { method: "PATCH", json: { estado: s.estado === "completada" ? "por_hacer" : "completada" } }))) { recargar(); onCambio(); }
  };
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {datos.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[#00e676]" checked={s.estado === "completada"} onChange={() => alternar(s)} aria-label={`Completar ${s.titulo}`} />
            <span className={s.estado === "completada" ? "line-through text-silver/60" : ""}>{s.titulo}</span>
            <span className="text-[11px] text-silver/60 ml-auto">{nombreEmpleado(s.responsable)}</span>
          </li>
        ))}
        {!datos.length && <li className="text-xs text-silver/60">Sin subtareas.</li>}
      </ul>
      <div className="flex gap-2">
        <input className={campoCls} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nueva subtarea" onKeyDown={(e) => e.key === "Enter" && agregar()} />
        <Button size="sm" onClick={agregar} aria-label="Agregar subtarea"><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

type Item = { id: string; texto: string; hecho: boolean; orden: number };
function Checklist({ tareaId }: { tareaId: string }) {
  const { intentar } = useGestion();
  const { datos, recargar, setDatos } = useLista<Item>("tarea_checklist", { "f.tarea_id": tareaId, size: 200 });
  const [nuevo, setNuevo] = useState("");
  const hechos = datos.filter((d) => d.hecho).length;
  return (
    <div className="space-y-2">
      {datos.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-silver"><CheckSquare className="w-3.5 h-3.5" />
          <span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-status-green" style={{ width: `${(hechos / datos.length) * 100}%` }} /></span>
          <span translate="no">{hechos}/{datos.length}</span>
        </div>
      )}
      <ul className="space-y-1">
        {datos.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm group">
            <input type="checkbox" className="accent-[#00e676]" checked={i.hecho} aria-label={i.texto}
              onChange={async () => {
                setDatos((d) => d.map((x) => (x.id === i.id ? { ...x, hecho: !x.hecho } : x)));
                if (!(await intentar(() => api(`/api/gestion/tarea_checklist/${i.id}`, { method: "PATCH", json: { hecho: !i.hecho } })))) recargar();
              }} />
            <span className={`flex-1 ${i.hecho ? "line-through text-silver/60" : ""}`}>{i.texto}</span>
            <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-red-300" aria-label={`Quitar ${i.texto}`}
              onClick={async () => { if (await intentar(() => api(`/api/gestion/tarea_checklist/${i.id}`, { method: "DELETE" }))) recargar(); }}><X className="w-3.5 h-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={campoCls} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nuevo elemento"
          onKeyDown={async (e) => {
            if (e.key !== "Enter" || !nuevo.trim()) return;
            if (await intentar(() => api("/api/gestion/tarea_checklist", { method: "POST", json: { tarea_id: tareaId, texto: nuevo.trim(), orden: datos.length } }))) { setNuevo(""); recargar(); }
          }} />
      </div>
    </div>
  );
}

type Comentario = { id: string; texto: string; created_at: string; autor: { nombre: string; apellido: string } | null };
function Comentarios({ tareaId }: { tareaId: string }) {
  const { intentar, sesion } = useGestion();
  const { datos, recargar } = useLista<Comentario>("tarea_comentarios", { "f.tarea_id": tareaId, size: 200 });
  const [texto, setTexto] = useState("");
  return (
    <div className="space-y-3">
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {datos.map((c) => (
          <li key={c.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] text-silver"><span className="text-cyan">{nombreEmpleado(c.autor)}</span> · {fmtFechaHora(c.created_at)}</p>
            <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
          </li>
        ))}
        {!datos.length && <li className="text-xs text-silver/60 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Sin comentarios.</li>}
      </ul>
      {sesion?.empleado_id ? (
        <div className="flex gap-2 items-end">
          <textarea rows={2} className={campoCls} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un comentario…" />
          <Button size="sm" disabled={!texto.trim()} onClick={async () => {
            if (await intentar(() => api("/api/gestion/tarea_comentarios", { method: "POST", json: { tarea_id: tareaId, texto: texto.trim() } }))) { setTexto(""); recargar(); }
          }}>Enviar</Button>
        </div>
      ) : <p className="text-xs text-silver/60">Para comentar necesitas un expediente de empleado.</p>}
    </div>
  );
}

type Colab = { tarea_id: string; empleado_id: string; empleado: { id: string; nombre: string; apellido: string } | null };
type Dep = { tarea_id: string; depende_de: string };
function Relaciones({ tarea, onCambio }: { tarea: Tarea; onCambio: () => void }) {
  const { intentar } = useGestion();
  const colabs = useLista<Colab & { id: string }>("tarea_colaboradores", { "f.tarea_id": tarea.id, size: 100 });
  const deps = useLista<Dep & { id: string }>("tarea_dependencias", { "f.tarea_id": tarea.id, size: 100 });
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = deps.datos.map((d) => d.depende_de).filter((x) => !nombres[x]);
    if (ids.length) api<{ datos: { id: string; titulo: string }[] }>(`/api/gestion/tareas?f.id=${ids.join(",")}&size=100`)
      .then((r) => setNombres((n) => ({ ...n, ...Object.fromEntries(r.datos.map((t) => [t.id, t.titulo])) }))).catch(() => null);
  }, [deps.datos, nombres]);

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <div className="space-y-2">
        <h3 className="text-xs font-ui text-silver flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Colaboradores</h3>
        <ul className="space-y-1">
          {colabs.datos.map((c) => (
            <li key={c.empleado_id} className="flex items-center justify-between text-sm">
              {nombreEmpleado(c.empleado)}
              <button className="text-red-300" aria-label="Quitar colaborador" onClick={async () => {
                if (await intentar(() => api(`/api/gestion/tarea_colaboradores?tarea_id=${tarea.id}&empleado_id=${c.empleado_id}`, { method: "DELETE" }))) colabs.recargar();
              }}><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
          {!colabs.datos.length && <li className="text-xs text-silver/60">Sin colaboradores.</li>}
        </ul>
        <SelectorRef recurso="empleados" value={null} placeholder="Agregar colaborador…" etiqueta={etqEmpleado} filtros={{ estado: "activo" }}
          onChange={async (empId) => {
            if (empId && await intentar(() => api("/api/gestion/tarea_colaboradores", { method: "POST", json: { tarea_id: tarea.id, empleado_id: empId } }), "Colaborador agregado")) colabs.recargar();
          }} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-ui text-silver flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />Depende de (debe terminar antes)</h3>
        <ul className="space-y-1">
          {deps.datos.map((d) => (
            <li key={d.depende_de} className="flex items-center justify-between text-sm">
              <span className="truncate">{nombres[d.depende_de] ?? "…"}</span>
              <button className="text-red-300" aria-label="Quitar dependencia" onClick={async () => {
                if (await intentar(() => api(`/api/gestion/tarea_dependencias?tarea_id=${tarea.id}&depende_de=${d.depende_de}`, { method: "DELETE" }))) { deps.recargar(); onCambio(); }
              }}><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
          {!deps.datos.length && <li className="text-xs text-silver/60">Sin dependencias.</li>}
        </ul>
        <SelectorRef recurso="tareas" value={null} placeholder="Agregar dependencia…" etiqueta={(f) => String(f.titulo)}
          filtros={tarea.proyecto_id ? { proyecto_id: tarea.proyecto_id } : undefined}
          onChange={async (dep) => {
            if (dep && dep !== tarea.id && await intentar(() => api("/api/gestion/tarea_dependencias", { method: "POST", json: { tarea_id: tarea.id, depende_de: dep } }), "Dependencia agregada")) { deps.recargar(); onCambio(); }
          }} />
      </div>
    </div>
  );
}
