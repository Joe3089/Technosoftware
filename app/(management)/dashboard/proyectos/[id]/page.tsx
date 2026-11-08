"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion } from "@/components/management/contexto";
import { Formulario } from "@/components/management/Formulario";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import { Adjuntos } from "@/components/shared/Adjuntos";
import { Historial } from "@/components/shared/Historial";
import Actividades from "@/components/planning/Actividades";
import { CAMPOS_PROYECTO } from "@/components/management/proyectos/campos";
import { Cargando, Chip, ErrorCaja, Modal, Tarjeta, campoCls, fmtFecha, fmtFechaHora, fmtMonto } from "@/components/management/ui";
import { etqEmpleado } from "@/components/planning/comun";
import {
  ESTADOS_FACTURA, ESTADOS_ITEM, ESTADOS_PROYECTO, ETAPAS_PROYECTO, PRIORIDADES, TIPOS_ITEM_PROYECTO, color, etiqueta, nombreEmpleado,
} from "@/lib/services/constantes";

type Proyecto = {
  id: string; codigo: string; nombre: string; descripcion: string | null; estado: string; etapa: string; prioridad: string; avance: number | null;
  presupuesto: number | null; moneda: string; inicio_plan: string | null; fin_plan: string | null; fecha_inicio: string | null; fecha_fin: string | null;
  user_id: string | null; created_at: string; cliente: { id: string; nombre: string; empresa: string | null } | null;
  departamento: { nombre: string } | null; coordinador: { nombre: string; apellido: string } | null;
};
const PESTANAS = ["resumen", "actividades", "equipo", "contactos", "hitos", "expediente", "finanzas", "archivos", "observaciones", "historial"] as const;
type Pestana = (typeof PESTANAS)[number];
const TITULOS: Record<Pestana, string> = { resumen: "Resumen", actividades: "Actividades", equipo: "Equipo", contactos: "Contactos", hitos: "Hitos",
  expediente: "Requerimientos y entregables", finanzas: "Costos y facturación", archivos: "Documentación", observaciones: "Observaciones", historial: "Historial" };

export default function ExpedienteProyecto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { puede, avisar } = useGestion();
  const [p, setP] = useState<Proyecto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [editar, setEditar] = useState(false);
  const gestiona = puede("proyectos.gestionar");

  const cargar = useCallback(() => api<{ dato: Proyecto }>(`/api/gestion/proyectos/${id}`).then((r) => setP(r.dato)).catch((e) => setError(e.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);
  const guardar = async (d: Record<string, unknown>) => {
    const r = await api<{ dato: Proyecto }>(`/api/gestion/proyectos/${id}`, { method: "PATCH", json: d });
    setP(r.dato); setEditar(false); avisar("Proyecto actualizado");
  };

  if (error) return <ErrorCaja texto={error} />;
  if (!p) return <Cargando />;
  const fase = ETAPAS_PROYECTO.findIndex((e) => e.valor === p.etapa);
  const fijos = { proyecto_id: id };

  return (
    <div className="space-y-4">
      <Link href="/dashboard/proyectos" className="inline-flex items-center gap-1 text-xs text-silver hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Proyectos</Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-cyan" translate="no">{p.codigo}</p>
          <h1 className="font-ui font-bold text-xl sm:text-2xl">{p.nombre}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Chip texto={etiqueta(ESTADOS_PROYECTO, p.estado)} color={color(ESTADOS_PROYECTO, p.estado)} />
            <Chip texto={`Prioridad ${etiqueta(PRIORIDADES, p.prioridad).toLowerCase()}`} color={color(PRIORIDADES, p.prioridad)} />
            {p.cliente && <span className="text-xs text-silver">Cliente: {p.cliente.nombre}</span>}
          </div>
        </div>
        {gestiona && <Button variant="outline" size="sm" onClick={() => setEditar(true)}><Pencil className="w-3.5 h-3.5" />Editar</Button>}
      </div>

      {/* Fases del ciclo de vida */}
      <Tarjeta>
        <div className="flex items-center justify-between text-xs text-silver mb-2">
          <span>Fase actual: <span className="text-white">{etiqueta(ETAPAS_PROYECTO, p.etapa)}</span></span>
          <span translate="no">Avance {p.avance ?? 0}%</span>
        </div>
        <ol className="flex gap-1 overflow-x-auto pb-1">
          {ETAPAS_PROYECTO.map((e, i) => (
            <li key={e.valor} className="flex-1 min-w-[80px]">
              <button disabled={!gestiona} onClick={() => guardar({ etapa: e.valor }).catch((er) => avisar(er.message, "error"))}
                className={cn("w-full text-left rounded-md px-2 py-1.5 text-[10px] border transition-colors",
                  i < fase ? "bg-cyan/15 border-cyan/30 text-cyan" : i === fase ? "bg-blue-accent/30 border-blue-accent text-white font-semibold" : "border-glass-bd text-silver/60",
                  gestiona && "hover:border-blue-accent")} aria-current={i === fase ? "step" : undefined}>
                <span className="block" translate="no">{i + 1}</span>{e.etiqueta}
              </button>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
        {PESTANAS.filter((k) => k !== "finanzas" || puede("finanzas.ver")).map((k) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={cn("px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px", pestana === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white")}>{TITULOS[k]}</button>
        ))}
      </div>

      {pestana === "resumen" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Tarjeta titulo="Datos generales">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[["Departamento", p.departamento?.nombre ?? "—"], ["Coordinador", nombreEmpleado(p.coordinador)],
                ["Presupuesto", fmtMonto(p.presupuesto, p.moneda)], ["Inicio planificado", fmtFecha(p.inicio_plan)],
                ["Fin planificado", fmtFecha(p.fin_plan)], ["Inicio real", fmtFecha(p.fecha_inicio)], ["Culminación real", fmtFecha(p.fecha_fin)],
                ["Creado", fmtFecha(p.created_at)], ["Cuenta de cliente", p.user_id ? "Vinculada" : "Sin cuenta (interno o prospecto)"]].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] text-silver">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </Tarjeta>
          <Tarjeta titulo="Descripción"><p className="text-sm text-silver whitespace-pre-wrap">{p.descripcion || "Sin descripción."}</p></Tarjeta>
        </div>
      )}
      {pestana === "actividades" && <Suspense fallback={<Cargando />}><Actividades proyectoId={id} /></Suspense>}
      {pestana === "equipo" && (
        <RecursoTabla recurso="proyecto_equipo" fijos={fijos} buscar={false} puedeCrear={gestiona} textoNuevo="Agregar miembro"
          campos={[{ nombre: "empleado_id", etiqueta: "Empleado", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, requerido: true },
            { nombre: "rol", etiqueta: "Rol en el proyecto", tipo: "texto" }]}
          puedeEditar={false} acciones={(f, recargar) => gestiona && <QuitarRelacion url={`/api/gestion/proyecto_equipo?proyecto_id=${id}&empleado_id=${f.empleado_id}`} onHecho={recargar} />}
          columnas={[{ clave: "empleado", titulo: "Miembro", render: (f) => nombreEmpleado(f.empleado as { nombre: string; apellido: string }) }, { clave: "rol", titulo: "Rol" }]} />
      )}
      {pestana === "contactos" && (
        <RecursoTabla recurso="proyecto_contactos" fijos={fijos} buscar={false} puedeCrear textoNuevo="Vincular contacto" puedeEditar={false}
          campos={[{ nombre: "contacto_id", etiqueta: "Contacto", tipo: "ref", recurso: "contactos", refEtiqueta: (c) => `${c.nombre} ${c.apellido ?? ""}${c.empresa ? ` · ${c.empresa}` : ""}`, requerido: true },
            { nombre: "rol", etiqueta: "Rol", tipo: "texto" }]}
          acciones={(f, recargar) => <QuitarRelacion url={`/api/gestion/proyecto_contactos?proyecto_id=${id}&contacto_id=${f.contacto_id}`} onHecho={recargar} />}
          columnas={[{ clave: "contacto", titulo: "Contacto", render: (f) => { const c = f.contacto as { nombre: string; apellido: string; empresa: string | null } | null; return c ? `${c.nombre} ${c.apellido}` : "—"; } },
            { clave: "empresa", titulo: "Empresa", render: (f) => (f.contacto as { empresa?: string } | null)?.empresa ?? "—" },
            { clave: "email", titulo: "Correo", render: (f) => (f.contacto as { email?: string } | null)?.email ?? "—" }, { clave: "rol", titulo: "Rol" }]} />
      )}
      {pestana === "hitos" && (
        <RecursoTabla recurso="proyecto_hitos" fijos={fijos} buscar={false} puedeCrear puedeEditar puedeBorrar textoNuevo="Nuevo hito"
          descripcionBorrar="El hito se eliminará del proyecto."
          campos={[{ nombre: "nombre", etiqueta: "Hito", tipo: "texto", requerido: true }, { nombre: "fecha", etiqueta: "Fecha", tipo: "fecha", requerido: true },
            { nombre: "completado", etiqueta: "Completado", tipo: "bool" }]}
          columnas={[{ clave: "nombre", titulo: "Hito" }, { clave: "fecha", titulo: "Fecha", render: (f) => fmtFecha(f.fecha as string) },
            { clave: "completado", titulo: "Estado", render: (f) => <Chip texto={f.completado ? "Completado" : "Pendiente"} color={f.completado ? "#00e676" : "#ffb300"} /> }]} />
      )}
      {pestana === "expediente" && <ItemsProyecto proyectoId={id} />}
      {pestana === "finanzas" && <FinanzasProyecto proyecto={p} />}
      {pestana === "archivos" && <Tarjeta titulo="Contratos, propuestas y documentación"><Adjuntos entidad="proyecto" entidadId={id} /></Tarjeta>}
      {pestana === "observaciones" && <Observaciones proyectoId={id} />}
      {pestana === "historial" && <Tarjeta><Historial entidad="proyectos" entidadId={id} /></Tarjeta>}

      <Modal abierto={editar} onCerrar={() => setEditar(false)} titulo="Editar proyecto">
        <Formulario campos={CAMPOS_PROYECTO} inicial={p as unknown as Record<string, unknown>} editando onGuardar={guardar} onCancelar={() => setEditar(false)} />
      </Modal>
    </div>
  );
}

function QuitarRelacion({ url, onHecho }: { url: string; onHecho: () => void }) {
  const { intentar } = useGestion();
  return <Button variant="link" size="sm" className="text-red-300" onClick={async () => { if (await intentar(() => api(url, { method: "DELETE" }), "Quitado")) onHecho(); }}>Quitar</Button>;
}

function ItemsProyecto({ proyectoId }: { proyectoId: string }) {
  const [tipo, setTipo] = useState("requerimiento");
  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {TIPOS_ITEM_PROYECTO.map((t) => (
          <Button key={t.valor} size="sm" variant={tipo === t.valor ? "default" : "outline"} onClick={() => setTipo(t.valor)}>{t.etiqueta}</Button>
        ))}
      </div>
      <RecursoTabla key={tipo} recurso="proyecto_items" fijos={{ proyecto_id: proyectoId, tipo }} puedeCrear puedeEditar puedeBorrar
        textoNuevo={`Nuevo: ${etiqueta(TIPOS_ITEM_PROYECTO, tipo).toLowerCase()}`} descripcionBorrar="El elemento se eliminará del expediente (queda en la auditoría)."
        filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_ITEM }]}
        campos={[{ nombre: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, completo: true }, { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
          { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: ESTADOS_ITEM, requerido: true }]}
        nuevoInicial={{ estado: "pendiente" }}
        columnas={[{ clave: "titulo", titulo: "Título", render: (f) => <span className="font-medium">{String(f.titulo)}</span> },
          { clave: "estado", titulo: "Estado", render: (f) => etiqueta(ESTADOS_ITEM, f.estado as string) },
          { clave: "autor", titulo: "Registrado por", render: (f) => nombreEmpleado(f.autor as { nombre: string; apellido: string } | null) },
          { clave: "created_at", titulo: "Fecha", render: (f) => fmtFecha(f.created_at as string) }]} />
    </div>
  );
}

function FinanzasProyecto({ proyecto }: { proyecto: Proyecto }) {
  const [t, setT] = useState<{ ingresos: number; gastos: number } | null>(null);
  useEffect(() => {
    api<{ rentabilidad: { id: string; ingresos: number; gastos: number }[] }>(`/api/gestion/finanzas/reporte?desde=2000-01-01`)
      .then((r) => setT(r.rentabilidad.find((x) => x.id === proyecto.id) ?? { ingresos: 0, gastos: 0 })).catch(() => setT(null));
  }, [proyecto.id]);
  const margen = t && t.ingresos ? ((t.ingresos - t.gastos) / t.ingresos) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" translate="no">
        <Tarjeta><p className="text-xs text-silver">Presupuesto</p><p className="text-lg font-bold">{fmtMonto(proyecto.presupuesto, proyecto.moneda)}</p></Tarjeta>
        <Tarjeta><p className="text-xs text-silver">Ingresos cobrados</p><p className="text-lg font-bold text-status-green">{fmtMonto(t?.ingresos ?? 0)}</p></Tarjeta>
        <Tarjeta><p className="text-xs text-silver">Costos y gastos</p><p className="text-lg font-bold text-red-300">{fmtMonto(t?.gastos ?? 0)}</p></Tarjeta>
        <Tarjeta><p className="text-xs text-silver">Margen</p><p className="text-lg font-bold">{margen == null ? "—" : `${margen.toFixed(1)}%`}</p></Tarjeta>
      </div>
      <RecursoTabla recurso="facturas" titulo="Facturas del proyecto" fijos={{ proyecto_id: proyecto.id }} buscar={false}
        columnas={[{ clave: "numero", titulo: "Número" }, { clave: "tipo", titulo: "Tipo", render: (f) => (f.tipo === "emitida" ? "Por cobrar" : "Por pagar") },
          { clave: "total", titulo: "Total", render: (f) => fmtMonto(f.total as number, f.moneda as string) },
          { clave: "pagado", titulo: "Pagado", render: (f) => fmtMonto(f.pagado as number, f.moneda as string) },
          { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_FACTURA, f.estado as string)} color={color(ESTADOS_FACTURA, f.estado as string)} /> }]} />
      <RecursoTabla recurso="finanzas_registros" titulo="Ingresos y costos directos" fijos={{ proyecto_id: proyecto.id, anulado: "false" }} buscar={false}
        columnas={[{ clave: "fecha", titulo: "Fecha", render: (f) => fmtFecha(f.fecha as string) }, { clave: "tipo", titulo: "Tipo", render: (f) => (f.tipo === "ingreso" ? "Ingreso" : "Gasto") },
          { clave: "categoria", titulo: "Categoría" }, { clave: "descripcion", titulo: "Descripción" },
          { clave: "monto", titulo: "Monto", render: (f) => fmtMonto(f.monto as number, f.moneda as string) }]} />
    </div>
  );
}

type Obs = { id: number; tipo: string; texto: string; created_at: string };
const TIPOS_OBS = [{ valor: "avance", etiqueta: "Avance" }, { valor: "incidencia", etiqueta: "Incidencia" }, { valor: "bloqueo", etiqueta: "Bloqueo" },
  { valor: "proximo_paso", etiqueta: "Próximo paso" }, { valor: "cierre", etiqueta: "Cierre" }];
/** Observaciones existentes del proyecto (inmutables). Las agrega el admin con la API ya existente. */
function Observaciones({ proyectoId }: { proyectoId: string }) {
  const { esAdmin, intentar } = useGestion();
  const [lista, setLista] = useState<Obs[]>([]);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("avance");
  const cargar = useCallback(() => api<{ datos: Obs[] }>(`/api/gestion/proyecto_observaciones?f.proyecto_id=${proyectoId}&size=100`).then((r) => setLista(r.datos)).catch(() => setLista([])), [proyectoId]);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <Tarjeta titulo="Observaciones (visibles para el cliente)">
      <ul className="space-y-2 mb-3">
        {lista.map((o) => (
          <li key={o.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
            <p className="text-[11px] text-silver">{etiqueta(TIPOS_OBS, o.tipo)} · {fmtFechaHora(o.created_at)}</p>{o.texto}
          </li>
        ))}
        {!lista.length && <li className="text-xs text-silver/60">Sin observaciones.</li>}
      </ul>
      {esAdmin && (
        <div className="flex flex-col sm:flex-row gap-2">
          <select className={cn(campoCls, "sm:w-40")} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
            {TIPOS_OBS.map((t) => <option key={t.valor} value={t.valor} className="bg-[#0b1430]">{t.etiqueta}</option>)}
          </select>
          <input className={campoCls} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nueva observación" />
          <Button size="sm" disabled={!texto.trim()} onClick={async () => {
            if (await intentar(() => api(`/api/proyectos/${proyectoId}/observaciones`, { method: "POST", json: { texto, tipo } }), "Observación registrada")) { setTexto(""); cargar(); }
          }}>Agregar</Button>
        </div>
      )}
    </Tarjeta>
  );
}
