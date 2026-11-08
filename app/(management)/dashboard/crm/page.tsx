"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { Formulario, type Campo } from "@/components/management/Formulario";
import { Cargando, Chip, ErrorCaja, Indicador, Modal, Tarjeta, Vacio, campoCls, fmtFecha, fmtFechaHora, fmtMonto, hoy } from "@/components/management/ui";
import { etqEmpleado } from "@/components/planning/comun";
import { etqCliente } from "@/components/management/proyectos/campos";
import { ETAPAS_CRM, MONEDAS, TIPOS_INTERACCION, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { Historial, HistorialModulo } from "@/components/shared/Historial";

type Op = {
  id: string; titulo: string; etapa: string; valor: number; moneda: string; probabilidad: number; fuente: string | null; orden: number;
  cierre_estimado: string | null; responsable_id: string | null; cliente_id: string | null; contacto_id: string | null; proyecto_id: string | null;
  motivo_perdida: string | null; descripcion: string | null; created_at: string; cerrada_at: string | null;
  responsable: { nombre: string; apellido: string } | null; contacto: { nombre: string; apellido: string; empresa: string | null } | null; cliente: { nombre: string } | null;
};
const etqContacto = (c: Record<string, unknown>) => `${c.nombre} ${c.apellido ?? ""}${c.empresa ? ` · ${c.empresa}` : ""}`;
const CAMPOS: Campo[] = [
  { nombre: "titulo", etiqueta: "Oportunidad", tipo: "texto", requerido: true, completo: true },
  { nombre: "contacto_id", etiqueta: "Contacto", tipo: "ref", recurso: "contactos", refEtiqueta: etqContacto, refInicial: (f) => (f.contacto ? etqContacto(f.contacto as Record<string, unknown>) : null) },
  { nombre: "cliente_id", etiqueta: "Cliente", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, refInicial: (f) => (f.cliente as { nombre?: string } | null)?.nombre },
  { nombre: "responsable_id", etiqueta: "Responsable", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.responsable ? etqEmpleado(f.responsable as Record<string, unknown>) : null) },
  { nombre: "etapa", etiqueta: "Etapa", tipo: "opciones", opciones: ETAPAS_CRM, requerido: true },
  { nombre: "valor", etiqueta: "Valor estimado", tipo: "numero", min: 0 },
  { nombre: "moneda", etiqueta: "Moneda", tipo: "opciones", opciones: MONEDAS, requerido: true },
  { nombre: "probabilidad", etiqueta: "Probabilidad (%)", tipo: "numero", min: 0, max: 100 },
  { nombre: "fuente", etiqueta: "Fuente", tipo: "opciones", catalogo: "fuente_crm" },
  { nombre: "cierre_estimado", etiqueta: "Cierre estimado", tipo: "fecha" },
  { nombre: "motivo_perdida", etiqueta: "Motivo de pérdida", tipo: "texto", completo: true, visible: (v) => v.etapa === "perdido" },
  { nombre: "descripcion", etiqueta: "Notas", tipo: "textarea" },
];

export default function PaginaCRM() {
  const { puede, sesion, avisar } = useGestion();
  const [vista, setVista] = useState<"pipeline" | "recordatorios" | "reportes">("pipeline");
  const [nueva, setNueva] = useState<Record<string, unknown> | null>(null);
  const [abierta, setAbierta] = useState<Op | null>(null);
  const [mias, setMias] = useState(false);
  const params: Record<string, string | number> = { size: 200 };
  if (mias && sesion?.empleado_id) params["f.responsable_id"] = sesion.empleado_id;
  const { datos, cargando, error, recargar, setDatos } = useLista<Op>("oportunidades", params);

  const mover = useCallback(async (id: string, cambios: Partial<Op>) => {
    let previo: Op | undefined;
    setDatos((d) => d.map((o) => (o.id === id ? ((previo = o), { ...o, ...cambios }) : o)));
    try {
      const r = await api<{ dato: Op }>(`/api/gestion/oportunidades/${id}`, { method: "PATCH", json: cambios });
      setDatos((d) => d.map((o) => (o.id === id ? r.dato : o)));
    } catch (e) {
      setDatos((d) => d.map((o) => (o.id === id && previo ? previo : o)));
      avisar(e instanceof Error ? e.message : "No se pudo mover", "error");
    }
  }, [setDatos, avisar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-ui font-bold text-xl mr-auto">CRM</h1>
        <HistorialModulo titulo="CRM" entidades={["oportunidades", "crm_interacciones"]} />
        <div role="tablist" className="inline-flex rounded-lg border border-glass-bd p-0.5">
          {(["pipeline", "recordatorios", "reportes"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
              className={cn("px-3 py-1.5 text-xs rounded-md capitalize", vista === v ? "bg-blue-accent/20 text-white" : "text-silver")}>{v}</button>
          ))}
        </div>
        {sesion?.empleado_id && <Button size="sm" variant={mias ? "default" : "outline"} onClick={() => setMias((m) => !m)}>Mías</Button>}
        {puede("crm.gestionar") && <Button size="sm" onClick={() => setNueva({ etapa: "nuevo", moneda: "USD", probabilidad: 10, responsable_id: sesion?.empleado_id })}><Plus className="w-4 h-4" />Nueva oportunidad</Button>}
      </div>

      {error ? <ErrorCaja texto={error} /> : cargando && !datos.length ? <Cargando /> : (
        <>
          {vista === "pipeline" && <Pipeline ops={datos} mover={mover} abrir={setAbierta} />}
          {vista === "recordatorios" && <Recordatorios />}
          {vista === "reportes" && <Reportes ops={datos} />}
        </>
      )}

      <Modal abierto={!!nueva} onCerrar={() => setNueva(null)} titulo="Nueva oportunidad">
        <Formulario campos={CAMPOS} inicial={nueva} textoGuardar="Crear" onCancelar={() => setNueva(null)}
          onGuardar={async (d) => { await api("/api/gestion/oportunidades", { method: "POST", json: d }); setNueva(null); avisar("Oportunidad creada"); recargar(); }} />
      </Modal>
      {abierta && <DetalleOportunidad op={abierta} onCerrar={() => setAbierta(null)} onCambio={(o) => { setDatos((d) => d.map((x) => (x.id === o.id ? o : x))); setAbierta(o); }} />}
    </div>
  );
}

function Pipeline({ ops, mover, abrir }: { ops: Op[]; mover: (id: string, c: Partial<Op>) => void; abrir: (o: Op) => void }) {
  const [arr, setArr] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {ETAPAS_CRM.map((e) => {
        const col = ops.filter((o) => o.etapa === e.valor).sort((a, b) => a.orden - b.orden);
        const total = col.reduce((s, o) => s + Number(o.valor), 0);
        return (
          <section key={e.valor} aria-label={e.etiqueta} className={cn("w-64 shrink-0 rounded-xl border bg-white/[0.02] flex flex-col max-h-[70vh]", sobre === e.valor ? "border-blue-accent/60" : "border-glass-bd")}
            onDragOver={(ev) => { ev.preventDefault(); setSobre(e.valor); }} onDragLeave={() => setSobre(null)}
            onDrop={(ev) => { ev.preventDefault(); setSobre(null); const o = ops.find((x) => x.id === arr); setArr(null);
              if (o && o.etapa !== e.valor) mover(o.id, { etapa: e.valor, orden: Date.now() / 1000 }); }}>
            <header className="px-3 py-2 border-b border-glass-bd">
              <p className="flex items-center gap-2 text-sm font-ui font-semibold"><span className="w-2 h-2 rounded-full" style={{ background: e.color }} />{e.etiqueta}<span className="text-xs text-silver/60 ml-auto" translate="no">{col.length}</span></p>
              <p className="text-[11px] text-silver" translate="no">{fmtMonto(total)}</p>
            </header>
            <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[80px]">
              {col.map((o) => (
                <article key={o.id} draggable onDragStart={() => setArr(o.id)} onDragEnd={() => setArr(null)} onClick={() => abrir(o)} tabIndex={0}
                  onKeyDown={(ev) => ev.key === "Enter" && abrir(o)}
                  className={cn("rounded-lg border border-glass-bd bg-navy-mid/60 p-2.5 cursor-grab hover:border-blue-accent/50 space-y-1", arr === o.id && "opacity-40")}>
                  <p className="text-sm leading-snug">{o.titulo}</p>
                  <p className="text-[11px] text-silver truncate">{o.contacto ? etqContacto(o.contacto) : o.cliente?.nombre ?? "Sin contacto"}</p>
                  <div className="flex items-center justify-between text-[11px]" translate="no">
                    <span className="text-cyan">{fmtMonto(o.valor, o.moneda)}</span><span className="text-silver">{o.probabilidad}%</span>
                  </div>
                  <p className="text-[10px] text-silver/60">{nombreEmpleado(o.responsable)}{o.cierre_estimado ? ` · ${fmtFecha(o.cierre_estimado)}` : ""}</p>
                  <select value={o.etapa} onClick={(ev) => ev.stopPropagation()} onChange={(ev) => mover(o.id, { etapa: ev.target.value })} aria-label="Mover a etapa"
                    className="md:hidden w-full bg-transparent text-[11px] rounded border border-glass-bd px-1 py-0.5 text-silver [color-scheme:dark]">
                    {ETAPAS_CRM.map((x) => <option key={x.valor} value={x.valor} className="bg-[#0b1430]">{x.etiqueta}</option>)}
                  </select>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

type Inter = { id: string; tipo: string; resumen: string; fecha: string; recordatorio: string | null; hecho: boolean; oportunidad_id: string | null; autor: { nombre: string; apellido: string } | null };

function DetalleOportunidad({ op, onCerrar, onCambio }: { op: Op; onCerrar: () => void; onCambio: (o: Op) => void }) {
  const { puede, intentar, avisar, sesion } = useGestion();
  const { datos: inter, recargar } = useLista<Inter>("crm_interacciones", { "f.oportunidad_id": op.id, size: 100 });
  const [nueva, setNueva] = useState({ tipo: "llamada", resumen: "", recordatorio: "" });
  const editable = puede("crm.gestionar") || op.responsable_id === sesion?.empleado_id;

  async function convertir() {
    const p = await intentar(() => api<{ dato: { id: string } }>("/api/gestion/proyectos", { method: "POST", json: {
      nombre: op.titulo, cliente_id: op.cliente_id, departamento_id: sesion?.empleado?.departamento_id ?? null, presupuesto: op.valor, moneda: op.moneda, etapa: "contrato", prioridad: "media", descripcion: op.descripcion } }));
    if (!p) return;
    const r = await intentar(() => api<{ dato: Op }>(`/api/gestion/oportunidades/${op.id}`, { method: "PATCH", json: { proyecto_id: p.dato.id } }), "Proyecto creado desde la oportunidad");
    if (r) onCambio(r.dato);
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={op.titulo} ancho="max-w-3xl">
      <div className="space-y-5">
        {op.etapa === "ganado" && (
          op.proyecto_id ? <Link href={`/dashboard/proyectos/${op.proyecto_id}`} className="text-sm text-cyan hover:underline">Ver proyecto creado →</Link>
            : puede("proyectos.gestionar") && <Button size="sm" onClick={convertir}><FolderPlus className="w-4 h-4" />Convertir en proyecto</Button>
        )}
        {editable ? (
          <Formulario campos={CAMPOS} inicial={op as unknown as Record<string, unknown>} editando onCancelar={onCerrar}
            onGuardar={async (d) => { const r = await api<{ dato: Op }>(`/api/gestion/oportunidades/${op.id}`, { method: "PATCH", json: d }); onCambio(r.dato); avisar("Oportunidad actualizada"); }} />
        ) : <p className="text-sm text-silver">{op.descripcion ?? "Sin notas."}</p>}
        <div className="border-t border-glass-bd pt-4 space-y-3">
          <h3 className="text-sm font-ui font-semibold">Seguimiento e interacciones</h3>
          {editable && sesion?.empleado_id && (
            <div className="grid sm:grid-cols-[130px_1fr_200px_auto] gap-2">
              <select className={campoCls} value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })} aria-label="Tipo">
                {TIPOS_INTERACCION.map((t) => <option key={t.valor} value={t.valor} className="bg-[#0b1430]">{t.etiqueta}</option>)}
              </select>
              <input className={campoCls} placeholder="Resumen de la interacción" value={nueva.resumen} onChange={(e) => setNueva({ ...nueva, resumen: e.target.value })} />
              <input type="datetime-local" className={campoCls} value={nueva.recordatorio} onChange={(e) => setNueva({ ...nueva, recordatorio: e.target.value })} aria-label="Recordatorio" title="Recordatorio (opcional)" />
              <Button size="sm" disabled={!nueva.resumen.trim()} onClick={async () => {
                const ok = await intentar(() => api("/api/gestion/crm_interacciones", { method: "POST", json: {
                  oportunidad_id: op.id, contacto_id: op.contacto_id, tipo: nueva.tipo, resumen: nueva.resumen.trim(),
                  recordatorio: nueva.recordatorio ? new Date(nueva.recordatorio).toISOString() : null } }), "Interacción registrada");
                if (ok) { setNueva({ tipo: "llamada", resumen: "", recordatorio: "" }); recargar(); }
              }}>Registrar</Button>
            </div>
          )}
          <ul className="space-y-2">
            {inter.map((i) => (
              <li key={i.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <p className="text-[11px] text-silver">{etiqueta(TIPOS_INTERACCION, i.tipo)} · {fmtFechaHora(i.fecha)} · {nombreEmpleado(i.autor)}</p>
                {i.resumen}
                {i.recordatorio && <p className={cn("text-[11px] mt-1 flex items-center gap-1", i.hecho ? "text-silver/50 line-through" : "text-amber-200")}><BellRing className="w-3 h-3" />{fmtFechaHora(i.recordatorio)}</p>}
              </li>
            ))}
            {!inter.length && <li className="text-xs text-silver/60">Sin interacciones registradas.</li>}
          </ul>
        </div>
        <div className="border-t border-glass-bd pt-4 space-y-2"><h3 className="text-sm font-ui font-semibold">Historial</h3><Historial entidad="oportunidades" entidadId={op.id} /></div>
      </div>
    </Modal>
  );
}

function Recordatorios() {
  const { intentar } = useGestion();
  const { datos, cargando, recargar } = useLista<Inter>("crm_interacciones", { "f.hecho": "false", size: 100, "r.recordatorio": "2000-01-01.." });
  const ahora = new Date().toISOString();
  if (cargando) return <Cargando />;
  const lista = [...datos].filter((d) => d.recordatorio).sort((a, b) => a.recordatorio!.localeCompare(b.recordatorio!));
  if (!lista.length) return <Vacio texto="No hay recordatorios pendientes." />;
  return (
    <ul className="space-y-2">
      {lista.map((i) => (
        <li key={i.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", i.recordatorio! < ahora ? "border-red-500/40 bg-red-950/20" : "border-glass-bd")}>
          <BellRing className="w-4 h-4 text-amber-200 shrink-0" />
          <div className="flex-1 min-w-0"><p className="text-sm truncate">{i.resumen}</p><p className="text-[11px] text-silver">{fmtFechaHora(i.recordatorio)} · {etiqueta(TIPOS_INTERACCION, i.tipo)}</p></div>
          <Button size="sm" variant="outline" onClick={async () => { if (await intentar(() => api(`/api/gestion/crm_interacciones/${i.id}`, { method: "PATCH", json: { hecho: true } }), "Marcado como hecho")) recargar(); }}>Hecho</Button>
        </li>
      ))}
    </ul>
  );
}

function Reportes({ ops }: { ops: Op[] }) {
  const [v, setV] = useState<Record<string, number | null> | null>(null);
  useEffect(() => { api<{ valores: Record<string, number | null> }>(`/api/gestion/estadisticas?desde=${hoy().slice(0, 4)}-01-01`).then((r) => setV(r.valores)).catch(() => setV({})); }, []);
  const porFuente = useMemo(() => {
    const m = new Map<string, { total: number; ganadas: number; valor: number }>();
    for (const o of ops) {
      const k = o.fuente ?? "Sin fuente";
      const x = m.get(k) ?? { total: 0, ganadas: 0, valor: 0 };
      x.total++; if (o.etapa === "ganado") { x.ganadas++; x.valor += Number(o.valor); }
      m.set(k, x);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [ops]);
  const max = Math.max(1, ...porFuente.map(([, x]) => x.total));
  return (
    <div className="space-y-4">
      <p className="text-xs text-silver">Indicadores del año en curso.</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Indicador titulo="Leads nuevos" valor={v?.com_leads ?? "—"} />
        <Indicador titulo="Tasa de conversión" valor={v?.com_conversion != null ? `${v.com_conversion}%` : "—"} color="#00e676" />
        <Indicador titulo="Pipeline ponderado" valor={v?.com_pipeline != null ? fmtMonto(v.com_pipeline) : "—"} color="#00cfff" />
        <Indicador titulo="Cierres ganados" valor={v?.com_cierres ?? "—"} color="#00e676" />
        <Indicador titulo="Ciclo comercial" valor={v?.com_ciclo != null ? `${v.com_ciclo} días` : "—"} color="#ffb300" />
        <Indicador titulo="Ticket promedio" valor={v?.com_ticket != null ? fmtMonto(v.com_ticket) : "—"} color="#b388ff" />
      </div>
      <Tarjeta titulo="Oportunidades por fuente">
        <ul className="space-y-2">
          {porFuente.map(([k, x]) => (
            <li key={k} className="text-sm">
              <div className="flex justify-between text-xs mb-1"><span>{k}</span><span className="text-silver" translate="no">{x.total} · {x.ganadas} ganadas · {fmtMonto(x.valor)}</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div className="h-full bg-status-green" style={{ width: `${(x.ganadas / max) * 100}%` }} />
                <div className="h-full bg-blue-accent/60" style={{ width: `${((x.total - x.ganadas) / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {!porFuente.length && <li className="text-xs text-silver/60">Sin datos.</li>}
        </ul>
      </Tarjeta>
      <Tarjeta titulo="Distribución por etapa">
        <div className="flex flex-wrap gap-2">
          {ETAPAS_CRM.map((e) => <Chip key={e.valor} texto={`${e.etiqueta}: ${ops.filter((o) => o.etapa === e.valor).length}`} color={color(ETAPAS_CRM, e.valor)} />)}
        </div>
      </Tarjeta>
    </div>
  );
}
