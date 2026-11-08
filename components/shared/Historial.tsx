"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/components/management/contexto";
import { Cargando, ErrorCaja, Modal, Paginacion, fmtFechaHora } from "@/components/management/ui";
import { ESTADOS_EMPLEADO, ESTADOS_FACTURA, ESTADOS_PROYECTO, ESTADOS_TAREA, ESTADOS_TICKET, ETAPAS_CRM, ETAPAS_PROYECTO, PRIORIDADES, ROLES_SISTEMA, etiqueta } from "@/lib/services/constantes";

type Ev = { id: number; accion: string; entidad: string; cambios: Record<string, unknown> | null; created_at: string; actor: string; registro: string | null };

const TABLA: Record<string, string> = {
  tareas: "Actividad", tarea_checklist: "Checklist", tarea_comentarios: "Comentario", tarea_colaboradores: "Colaborador", tarea_dependencias: "Dependencia",
  proyectos: "Proyecto", proyecto_equipo: "Equipo del proyecto", proyecto_hitos: "Hito", proyecto_items: "Requerimiento/entregable", proyecto_contactos: "Contacto del proyecto",
  contactos: "Contacto", clientes: "Cliente", oportunidades: "Oportunidad", crm_interacciones: "Interacción", empleados: "Empleado",
  empleado_evaluaciones: "Evaluación", empleado_datos: "Datos personales", facturas: "Factura", pagos_factura: "Pago", finanzas_registros: "Ingreso/gasto",
  presupuestos_gestion: "Presupuesto", movimientos: "Movimiento de billetera", tickets: "Ticket", ticket_comentarios: "Comentario de ticket",
  kpis: "KPI", kpi_mediciones: "Medición", archivos_gestion: "Archivo", departamentos: "Departamento", cargos: "Cargo",
  asignaciones_permiso: "Permiso", documentos_area: "Documento", catalogos: "Catálogo", parametros: "Parámetro", profiles: "Cuenta",
};
const CAMPO: Record<string, string> = {
  estado: "Estado", prioridad: "Prioridad", etapa: "Etapa", titulo: "Título", responsable_id: "Responsable", departamento_id: "Departamento",
  proyecto_id: "Proyecto", inicio: "Inicio", fin: "Fin", duracion_estimada: "Horas estimadas", tiempo_real: "Tiempo real", progreso: "Progreso",
  completada_at: "Completada", es_hito: "Hito", hecho: "Hecho", valor: "Valor", probabilidad: "Probabilidad", monto: "Monto", subtotal: "Subtotal",
  impuesto: "Impuesto", pagado: "Pagado", anulado: "Anulado", motivo_anulacion: "Motivo de anulación", rol_sistema: "Rol", es_coordinador: "Coordinador",
  cargo_id: "Cargo", supervisor_id: "Supervisor", profile_id: "Cuenta", fecha_desvinculacion: "Desvinculación", motivo_desvinculacion: "Motivo",
  presupuesto: "Presupuesto", avance: "Avance", inicio_plan: "Inicio planificado", fin_plan: "Fin planificado", coordinador_id: "Coordinador",
  cliente_id: "Cliente", contacto_id: "Contacto", meta: "Meta", fecha_vencimiento: "Vencimiento", tipo: "Tipo", role: "Rol de cuenta",
};
const OPCIONES: Record<string, Parameters<typeof etiqueta>[0]> = {
  prioridad: PRIORIDADES, rol_sistema: ROLES_SISTEMA,
};
const ESTADOS: Record<string, Parameters<typeof etiqueta>[0]> = {
  tareas: ESTADOS_TAREA, proyectos: ESTADOS_PROYECTO, tickets: ESTADOS_TICKET, facturas: ESTADOS_FACTURA, empleados: ESTADOS_EMPLEADO,
};
const ACCION: Record<string, string> = { crear: "creó", actualizar: "modificó", eliminar: "eliminó" };

function valor(entidad: string, campo: string, v: unknown) {
  if (v == null || v === "") return "vacío";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (campo.endsWith("_id")) return "otro registro";
  if (campo === "estado" && ESTADOS[entidad]) return etiqueta(ESTADOS[entidad], String(v));
  if (campo === "etapa") return etiqueta(entidad === "oportunidades" ? ETAPAS_CRM : ETAPAS_PROYECTO, String(v));
  if (OPCIONES[campo]) return etiqueta(OPCIONES[campo], String(v));
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtFechaHora(v);
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

/**
 * Historial de un registro (entidad + entidadId, incluye sus elementos hijos) o de un área completa (entidades).
 * Cada usuario ve el historial de lo que puede ver en su área.
 */
export function Historial({ entidad, entidadId, entidades }: { entidad?: string; entidadId?: string; entidades?: string[] }) {
  const [page, setPage] = useState(1);
  const [d, setD] = useState<{ datos: Ev[]; total: number; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lista = (entidades ?? [entidad!]).join(",");
  useEffect(() => {
    setD(null);
    const p = new URLSearchParams({ entidades: lista, page: String(page) });
    if (entidadId) p.set("id", entidadId);
    api<{ datos: Ev[]; total: number; size: number }>(`/api/gestion/historial?${p}`).then(setD).catch((e) => setError(e.message));
  }, [lista, entidadId, page]);

  if (error) return <ErrorCaja texto={error} />;
  if (!d) return <Cargando />;
  if (!d.datos.length) return <p className="text-xs text-silver/60">Sin cambios registrados.</p>;
  return (
    <div>
      <ol className="space-y-2.5 text-xs">
        {d.datos.map((e) => (
          <li key={e.id} className="border-l-2 border-blue-accent/40 pl-3">
            <p className="text-silver">
              <span className="text-[#f0f4ff] font-medium">{e.actor}</span> {ACCION[e.accion] ?? e.accion}{" "}
              <span className="text-cyan">{TABLA[e.entidad] ?? e.entidad}</span>
              {e.registro && !entidadId && <> en <span className="text-[#f0f4ff]">{e.registro}</span></>}
              <span className="text-silver/50"> · {fmtFechaHora(e.created_at)}</span>
            </p>
            {e.cambios && (
              <ul className="text-silver/80 mt-0.5 space-y-0.5">
                {Object.entries(e.cambios).filter(([k]) => k !== "created_at").map(([k, v]) => (
                  <li key={k}><span className="text-silver">{CAMPO[k] ?? k.replace(/_/g, " ")}</span>: {v && typeof v === "object" && "de" in (v as object)
                    ? <>{valor(e.entidad, k, (v as { de: unknown }).de)} → <span className="text-[#f0f4ff]">{valor(e.entidad, k, (v as { a: unknown }).a)}</span></>
                    : "modificado"}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <Paginacion page={page} size={d.size} total={d.total} onPage={setPage} />
    </div>
  );
}

/** Botón «Historial» del área: abre el registro de cambios de todas sus entidades. */
export function HistorialModulo({ titulo, entidades }: { titulo: string; entidades: string[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}><History className="w-3.5 h-3.5" />Historial</Button>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Historial · ${titulo}`} descripcion="Quién cambió qué y cuándo en esta área." ancho="max-w-3xl">
        {abierto && <Historial entidades={entidades} />}
      </Modal>
    </>
  );
}
