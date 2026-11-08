"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { Formulario, type Campo } from "@/components/management/Formulario";
import { Cargando, ErrorCaja, Etiqueta, Modal, Tarjeta, campoCls, fmtFecha, hoy } from "@/components/management/ui";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";
import { PERIODICIDADES, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { HistorialModulo } from "@/components/shared/Historial";

type Kpi = {
  id: string; clave: string | null; nombre: string; formula: string; meta: number | null; unidad: string; sentido: "mayor" | "menor";
  fuente: string | null; periodicidad: string; activo: boolean; responsable_id: string | null;
  departamento: { id: string; nombre: string } | null; responsable: { nombre: string; apellido: string } | null;
};
type Med = { id: string; kpi_id: string; periodo: string; valor: number; nota: string | null };

const CAMPOS: Campo[] = [
  { nombre: "nombre", etiqueta: "Indicador", tipo: "texto", requerido: true, completo: true },
  { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
  { nombre: "formula", etiqueta: "Fórmula", tipo: "texto", requerido: true, completo: true },
  { nombre: "meta", etiqueta: "Meta", tipo: "numero" },
  { nombre: "unidad", etiqueta: "Unidad", tipo: "texto", requerido: true },
  { nombre: "sentido", etiqueta: "Se considera mejor", tipo: "opciones", opciones: [{ valor: "mayor", etiqueta: "Mayor valor" }, { valor: "menor", etiqueta: "Menor valor" }], requerido: true },
  { nombre: "fuente", etiqueta: "Fuente de datos", tipo: "texto" },
  { nombre: "periodicidad", etiqueta: "Periodicidad", tipo: "opciones", opciones: PERIODICIDADES, requerido: true },
  { nombre: "responsable_id", etiqueta: "Responsable", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.responsable ? etqEmpleado(f.responsable as Record<string, unknown>) : null) },
  { nombre: "activo", etiqueta: "Activo", tipo: "bool" },
];

const cumple = (k: Kpi, v: number | null | undefined) => (v == null || k.meta == null ? null : k.sentido === "mayor" ? v >= k.meta : v <= k.meta);
const fmt = (v: number | null | undefined, u: string) => (v == null ? "—" : `${Number(v).toLocaleString("es", { maximumFractionDigits: 2 })} ${u}`);

export default function PaginaKpi() {
  const { puede, sesion, intentar, avisar } = useGestion();
  const [desde, setDesde] = useState(hoy().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoy());
  const [auto, setAuto] = useState<Record<string, number | null>>({});
  const [editar, setEditar] = useState<Kpi | "nuevo" | null>(null);
  const [medir, setMedir] = useState<Kpi | null>(null);
  const kpis = useLista<Kpi>("kpis", { size: 200, "f.activo": "true" });
  const ids = kpis.datos.map((k) => k.id).join(",");
  const meds = useLista<Med>(ids ? "kpi_mediciones" : null, { "f.kpi_id": ids.split(",").slice(0, 50).join(","), size: 200 });
  const gestiona = puede("kpi.gestionar");

  useEffect(() => { api<{ valores: Record<string, number | null> }>(`/api/gestion/estadisticas?desde=${desde}&hasta=${hasta}`).then((r) => setAuto(r.valores)).catch(() => setAuto({})); }, [desde, hasta]);

  const grupos = useMemo(() => {
    const m = new Map<string, Kpi[]>();
    for (const k of kpis.datos) { const d = k.departamento?.nombre ?? "General"; m.set(d, [...(m.get(d) ?? []), k]); }
    return [...m.entries()];
  }, [kpis.datos]);

  if (kpis.error) return <ErrorCaja texto={kpis.error} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="font-ui font-bold text-xl mr-auto">Estadísticas y KPI</h1>
        <HistorialModulo titulo="Estadísticas y KPI" entidades={["kpis", "kpi_mediciones"]} />
        <Etiqueta texto="Desde"><input type="date" className={campoCls} value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
        <Etiqueta texto="Hasta"><input type="date" className={campoCls} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
        {gestiona && <Button size="sm" onClick={() => setEditar("nuevo")}><Plus className="w-4 h-4" />Nuevo KPI</Button>}
      </div>
      <p className="text-xs text-silver">Los KPI con fuente automática se calculan con los datos del sistema que puedes ver. Los demás se registran como mediciones manuales.</p>
      {kpis.cargando ? <Cargando /> : grupos.map(([depto, lista]) => (
        <Tarjeta key={depto} titulo={depto}>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lista.map((k) => {
              const historial = meds.datos.filter((m) => m.kpi_id === k.id).sort((a, b) => a.periodo.localeCompare(b.periodo));
              const ultimo = historial.at(-1);
              const valor = k.clave && k.clave in auto ? auto[k.clave] : ultimo?.valor ?? null;
              const ok = cumple(k, valor);
              const max = Math.max(1, ...historial.map((h) => Math.abs(Number(h.valor))), Math.abs(k.meta ?? 0));
              const puedeMedir = gestiona || k.responsable_id === sesion?.empleado_id;
              return (
                <article key={k.id} className="rounded-lg border border-glass-bd p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <h3 className="text-sm font-ui font-semibold flex-1">{k.nombre}</h3>
                    {gestiona && <button className="text-silver hover:text-white" onClick={() => setEditar(k)} aria-label={`Editar ${k.nombre}`}><Pencil className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="flex items-baseline gap-2" translate="no">
                    <span className={cn("text-2xl font-bold", ok === true && "text-status-green", ok === false && "text-red-300")}>{fmt(valor, k.unidad)}</span>
                    {k.meta != null && <span className="text-xs text-silver">meta {k.sentido === "mayor" ? "≥" : "≤"} {fmt(k.meta, k.unidad)}</span>}
                  </div>
                  <p className="text-[11px] text-silver/80">{k.formula}</p>
                  <p className="text-[10px] text-silver/60">{k.fuente ?? "Sin fuente"} · {etiqueta(PERIODICIDADES, k.periodicidad)} · {nombreEmpleado(k.responsable)}</p>
                  {historial.length > 0 && (
                    <div className="flex items-end gap-0.5 h-10" role="img" aria-label={`Tendencia de ${k.nombre}`}>
                      {historial.slice(-12).map((h) => (
                        <div key={h.id} className={cn("flex-1 rounded-t", cumple(k, h.valor) === false ? "bg-red-400/60" : "bg-cyan/60")}
                          style={{ height: `${(Math.abs(Number(h.valor)) / max) * 100}%` }} title={`${fmtFecha(h.periodo)}: ${fmt(h.valor, k.unidad)}`} />
                      ))}
                    </div>
                  )}
                  {puedeMedir && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMedir(k)}>Registrar medición</Button>
                      {k.clave && auto[k.clave] != null && (
                        <Button variant="link" size="sm" className="h-7 text-xs" title="Guardar el valor automático como medición del período" onClick={async () => {
                          if (await intentar(() => api("/api/gestion/kpi_mediciones", { method: "POST", json: { kpi_id: k.id, periodo: desde, valor: auto[k.clave!], nota: `Automático ${desde} → ${hasta}` } }), "Medición guardada")) meds.recargar();
                        }}><Save className="w-3.5 h-3.5" />Guardar</Button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </Tarjeta>
      ))}

      <Modal abierto={!!editar} onCerrar={() => setEditar(null)} titulo={editar === "nuevo" ? "Nuevo KPI" : "Editar KPI"}>
        <Formulario campos={CAMPOS} inicial={editar === "nuevo" ? { unidad: "%", sentido: "mayor", periodicidad: "mensual", activo: true } : (editar as unknown as Record<string, unknown>)}
          editando={editar !== "nuevo"} onCancelar={() => setEditar(null)}
          onGuardar={async (d) => {
            if (editar === "nuevo") await api("/api/gestion/kpis", { method: "POST", json: d });
            else await api(`/api/gestion/kpis/${(editar as Kpi).id}`, { method: "PATCH", json: d });
            setEditar(null); avisar("KPI guardado"); kpis.recargar();
          }} />
      </Modal>
      <Modal abierto={!!medir} onCerrar={() => setMedir(null)} titulo={`Medición · ${medir?.nombre ?? ""}`} ancho="max-w-md">
        <Formulario inicial={{ periodo: desde }} textoGuardar="Registrar" onCancelar={() => setMedir(null)}
          campos={[{ nombre: "periodo", etiqueta: "Inicio del período", tipo: "fecha", requerido: true }, { nombre: "valor", etiqueta: `Valor (${medir?.unidad ?? ""})`, tipo: "numero", requerido: true },
            { nombre: "nota", etiqueta: "Nota", tipo: "texto" }]}
          onGuardar={async (d) => { await api("/api/gestion/kpi_mediciones", { method: "POST", json: { ...d, kpi_id: medir!.id } }); setMedir(null); avisar("Medición registrada"); meds.recargar(); }} />
      </Modal>
    </div>
  );
}
