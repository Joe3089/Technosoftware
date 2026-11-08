"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { Formulario, type Campo } from "@/components/management/Formulario";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import { Adjuntos } from "@/components/shared/Adjuntos";
import { Historial, HistorialModulo } from "@/components/shared/Historial";
import { Cargando, Chip, Indicador, Modal, campoCls, fmtFechaHora } from "@/components/management/ui";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";
import { etqCliente } from "@/components/management/proyectos/campos";
import { ESTADOS_TICKET, PRIORIDADES, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";

const CAMPOS: Campo[] = [
  { nombre: "titulo", etiqueta: "Asunto", tipo: "texto", requerido: true, completo: true },
  { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
  { nombre: "cliente_id", etiqueta: "Cliente", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, refInicial: (f) => (f.cliente as { nombre?: string } | null)?.nombre },
  { nombre: "proyecto_id", etiqueta: "Proyecto", tipo: "ref", recurso: "proyectos", refEtiqueta: (f) => `${f.codigo} · ${f.nombre}`, refInicial: (f) => (f.proyecto as { codigo?: string } | null)?.codigo },
  { nombre: "categoria", etiqueta: "Categoría", tipo: "opciones", catalogo: "categoria_ticket" },
  { nombre: "prioridad", etiqueta: "Prioridad", tipo: "opciones", opciones: PRIORIDADES, requerido: true },
  { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
  { nombre: "responsable_id", etiqueta: "Responsable", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.responsable ? etqEmpleado(f.responsable as Record<string, unknown>) : null) },
  { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: ESTADOS_TICKET, requerido: true, soloEditar: true },
];

function Soporte() {
  const { sesion, puede, avisar, intentar } = useGestion();
  const sp = useSearchParams();
  const router = useRouter();
  const [abierto, setAbierto] = useState<Fila | null>(null);
  const [m, setM] = useState<{ mttr: number | null } | null>(null);
  const [tick, setTick] = useState(0);
  const abiertos = useLista<Fila>("tickets", { "f.estado": "abierto,asignado,en_proceso,en_espera", size: 1 });
  const urgentes = useLista<Fila>("tickets", { "f.estado": "abierto,asignado,en_proceso,en_espera", "f.prioridad": "urgente", size: 1 });

  useEffect(() => { api<{ valores: Record<string, number | null> }>("/api/gestion/estadisticas").then((r) => setM({ mttr: r.valores.tec_mttr ?? null })).catch(() => setM({ mttr: null })); }, []);
  useEffect(() => {
    const id = sp.get("ticket");
    if (id) api<{ dato: Fila }>(`/api/gestion/tickets/${id}`).then((r) => setAbierto(r.dato)).catch((e) => avisar(e.message, "error"));
  }, [sp, avisar]);
  const cerrar = () => { setAbierto(null); if (sp.get("ticket")) router.replace("/dashboard/soporte"); };
  const editable = (t: Fila) => puede("tickets.gestionar") || t.responsable_id === sesion?.empleado_id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-ui font-bold text-xl">Soporte técnico</h1>
        <HistorialModulo titulo="Soporte técnico" entidades={["tickets", "ticket_comentarios"]} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Indicador titulo="Tickets abiertos" valor={abiertos.total} />
        <Indicador titulo="Urgentes sin resolver" valor={urgentes.total} color="#ff5370" />
        <Indicador titulo="MTTR del mes" valor={m?.mttr != null ? `${m.mttr} h` : "—"} detalle="Tiempo medio de resolución" color="#00cfff" />
      </div>
      <RecursoTabla key={tick} recurso="tickets" campos={CAMPOS} puedeCrear textoNuevo="Nuevo ticket" onAbrir={setAbierto}
        nuevoInicial={{ prioridad: "media", departamento_id: sesion?.empleado?.departamento_id }}
        filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_TICKET }, { clave: "prioridad", etiqueta: "Prioridad", opciones: PRIORIDADES }]}
        acciones={(f) => editable(f) && f.estado !== "cerrado" && (
          <select value={f.estado as string} aria-label="Cambiar estado" className="bg-transparent text-xs rounded border border-glass-bd px-1 py-0.5 [color-scheme:dark]"
            style={{ color: color(ESTADOS_TICKET, f.estado as string) }}
            onChange={async (e) => { if (await intentar(() => api(`/api/gestion/tickets/${f.id}`, { method: "PATCH", json: { estado: e.target.value } }), "Estado actualizado")) setTick((x) => x + 1); }}>
            {ESTADOS_TICKET.map((x) => <option key={x.valor} value={x.valor} className="bg-[#0b1430] text-white">{x.etiqueta}</option>)}
          </select>
        )}
        columnas={[
          { clave: "numero", titulo: "#", orden: "numero", render: (f) => <span className="text-cyan" translate="no">#{String(f.numero)}</span> },
          { clave: "titulo", titulo: "Asunto", render: (f) => <span className="font-medium">{String(f.titulo)}</span> },
          { clave: "cliente", titulo: "Cliente / proyecto", render: (f) => (f.cliente as { nombre?: string } | null)?.nombre ?? (f.proyecto as { codigo?: string } | null)?.codigo ?? "Interno" },
          { clave: "categoria", titulo: "Categoría" },
          { clave: "prioridad", titulo: "Prioridad", orden: "prioridad", render: (f) => <Chip texto={etiqueta(PRIORIDADES, f.prioridad as string)} color={color(PRIORIDADES, f.prioridad as string)} /> },
          { clave: "responsable", titulo: "Responsable", render: (f) => nombreEmpleado(f.responsable as { nombre: string; apellido: string } | null) },
          { clave: "estado", titulo: "Estado", orden: "estado", render: (f) => <Chip texto={etiqueta(ESTADOS_TICKET, f.estado as string)} color={color(ESTADOS_TICKET, f.estado as string)} /> },
          { clave: "created_at", titulo: "Creado", orden: "created_at", render: (f) => fmtFechaHora(f.created_at as string) },
        ]} />
      {abierto && <DetalleTicket ticket={abierto} editable={editable(abierto)} onCerrar={cerrar} onCambio={(t) => { setAbierto(t); setTick((x) => x + 1); }} />}
    </div>
  );
}

type Com = { id: string; texto: string; created_at: string; autor: { nombre: string; apellido: string } | null };
function DetalleTicket({ ticket, editable, onCerrar, onCambio }: { ticket: Fila; editable: boolean; onCerrar: () => void; onCambio: (t: Fila) => void }) {
  const { intentar, avisar, sesion } = useGestion();
  const { datos, recargar } = useLista<Com>("ticket_comentarios", { "f.ticket_id": ticket.id, size: 200 });
  const [texto, setTexto] = useState("");
  return (
    <Modal abierto onCerrar={onCerrar} titulo={`#${ticket.numero} · ${ticket.titulo}`} ancho="max-w-3xl"
      descripcion={`Creado ${fmtFechaHora(ticket.created_at as string)}${ticket.resuelto_at ? ` · resuelto ${fmtFechaHora(ticket.resuelto_at as string)}` : ""}`}>
      <div className="space-y-5">
        {editable ? (
          <Formulario campos={CAMPOS} inicial={ticket} editando onCancelar={onCerrar}
            onGuardar={async (d) => { const r = await api<{ dato: Fila }>(`/api/gestion/tickets/${ticket.id}`, { method: "PATCH", json: d }); onCambio(r.dato); avisar("Ticket actualizado"); }} />
        ) : <p className="text-sm text-silver whitespace-pre-wrap">{String(ticket.descripcion ?? "Sin descripción.")}</p>}
        <section className="border-t border-glass-bd pt-4 space-y-2">
          <h3 className="text-sm font-ui font-semibold">Comentarios</h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {datos.map((c) => (
              <li key={c.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <p className="text-[11px] text-silver"><span className="text-cyan">{nombreEmpleado(c.autor)}</span> · {fmtFechaHora(c.created_at)}</p>
                <p className="whitespace-pre-wrap">{c.texto}</p>
              </li>
            ))}
            {!datos.length && <li className="text-xs text-silver/60">Sin comentarios.</li>}
          </ul>
          {sesion?.empleado_id && (
            <div className="flex gap-2 items-end">
              <textarea rows={2} className={campoCls} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un comentario interno…" />
              <Button size="sm" disabled={!texto.trim()} onClick={async () => {
                if (await intentar(() => api("/api/gestion/ticket_comentarios", { method: "POST", json: { ticket_id: ticket.id, texto: texto.trim() } }))) { setTexto(""); recargar(); }
              }}>Enviar</Button>
            </div>
          )}
        </section>
        <section className="border-t border-glass-bd pt-4 space-y-2"><h3 className="text-sm font-ui font-semibold">Archivos</h3><Adjuntos entidad="ticket" entidadId={ticket.id} /></section>
        <section className="border-t border-glass-bd pt-4 space-y-2"><h3 className="text-sm font-ui font-semibold">Historial</h3><Historial entidad="tickets" entidadId={ticket.id} /></section>
      </div>
    </Modal>
  );
}

export default function PaginaSoporte() {
  return <Suspense fallback={<Cargando />}><Soporte /></Suspense>;
}
