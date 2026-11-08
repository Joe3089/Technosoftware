"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Pencil, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion } from "@/components/management/contexto";
import { Formulario } from "@/components/management/Formulario";
import { RecursoTabla } from "@/components/management/RecursoTabla";
import { Adjuntos } from "@/components/shared/Adjuntos";
import { Historial } from "@/components/shared/Historial";
import { camposEmpleado } from "@/components/management/empleados/campos";
import { Cargando, Chip, Confirmar, ErrorCaja, Etiqueta, Modal, SelectorRef, Tarjeta, campoCls, fmtFecha, hoy } from "@/components/management/ui";
import { etqEmpleado } from "@/components/planning/comun";
import { ESTADOS_EMPLEADO, ESTADOS_TAREA, ROLES_SISTEMA, color, etiqueta, etiquetaRol, nombreEmpleado } from "@/lib/services/constantes";

type Emp = {
  id: string; profile_id: string | null; nombre: string; apellido: string; email_corporativo: string; telefono: string | null;
  rol_sistema: string; es_coordinador: boolean; estado: string; fecha_ingreso: string | null; tipo_contrato: string | null; fecha_desvinculacion: string | null;
  motivo_desvinculacion: string | null; departamento: { nombre: string } | null; cargo: { nombre: string } | null; supervisor: { nombre: string; apellido: string } | null;
};
const PESTANAS = { datos: "Datos", personales: "Datos personales", actividades: "Actividades", evaluaciones: "Evaluaciones", documentos: "Documentación", historial: "Historial" };
const DATOS_PERSONALES = [["cedula", "Documento de identidad"], ["fecha_nacimiento", "Fecha de nacimiento"], ["direccion", "Dirección"],
  ["contacto_emergencia", "Contacto de emergencia"], ["telefono_emergencia", "Teléfono de emergencia"], ["profesion", "Profesión"]] as const;

export default function ExpedienteEmpleado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { puede, esAdmin, sesion, intentar, avisar } = useGestion();
  const router = useRouter();
  const [e, setE] = useState<Emp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<keyof typeof PESTANAS>("datos");
  const [modal, setModal] = useState<"editar" | "desvincular" | "eliminar" | "acceso" | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const gestiona = puede("empleados.gestionar");
  const asignaRol = esAdmin || puede("empleados.asignar_rol");
  const propio = sesion?.empleado_id === id;

  const cargar = useCallback(() => api<{ dato: Emp }>(`/api/gestion/empleados/${id}`).then((r) => setE(r.dato)).catch((x) => setError(x.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  if (error) return <ErrorCaja texto={error} />;
  if (!e) return <Cargando />;
  const desvinculado = e.estado === "desvinculado";

  return (
    <div className="space-y-4">
      <Link href="/dashboard/empleados" className="inline-flex items-center gap-1 text-xs text-silver hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Talento Humano</Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-ui font-bold text-xl sm:text-2xl">{nombreEmpleado(e)}</h1>
          <p className="text-sm text-silver">{e.cargo?.nombre ?? "Sin cargo"} · {e.departamento?.nombre ?? "Sin departamento"}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Chip texto={etiqueta(ESTADOS_EMPLEADO, e.estado)} color={color(ESTADOS_EMPLEADO, e.estado)} />
            <Chip texto={etiquetaRol(e.rol_sistema, e.es_coordinador)} color={color(ROLES_SISTEMA, e.rol_sistema)} />
            <Chip texto={e.profile_id ? "Con acceso al sistema" : "Sin cuenta"} color={e.profile_id ? "#00e676" : "#5c6b8a"} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {gestiona && !desvinculado && <Button variant="outline" size="sm" onClick={() => setModal("editar")}><Pencil className="w-3.5 h-3.5" />Editar</Button>}
          {asignaRol && !e.profile_id && !desvinculado && <Button variant="outline" size="sm" onClick={() => setModal("acceso")}><KeyRound className="w-3.5 h-3.5" />Dar acceso</Button>}
          {gestiona && !desvinculado && !propio && <Button variant="destructive" size="sm" onClick={() => setModal("desvincular")}><UserMinus className="w-3.5 h-3.5" />Desvincular</Button>}
          {esAdmin && desvinculado && <Button variant="outline" size="sm" onClick={async () => {
            if (await intentar(() => api(`/api/gestion/personal/${id}/acceso`, { method: "POST", json: { accion: "reincorporar" } }), "Empleado reincorporado")) cargar();
          }}><RotateCcw className="w-3.5 h-3.5" />Reincorporar</Button>}
          {esAdmin && desvinculado && <Button variant="destructive" size="sm" onClick={() => setModal("eliminar")}><Trash2 className="w-3.5 h-3.5" />Eliminar definitivamente</Button>}
        </div>
      </div>

      {desvinculado && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-100">
          Desvinculado el {fmtFecha(e.fecha_desvinculacion)}. Motivo: {e.motivo_desvinculacion}. Su acceso está revocado y su historial se conserva.
        </div>
      )}

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
        {(Object.keys(PESTANAS) as (keyof typeof PESTANAS)[]).filter((k) => !["personales", "evaluaciones", "documentos"].includes(k) || gestiona || propio).map((k) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={cn("px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px", pestana === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white")}>{PESTANAS[k]}</button>
        ))}
      </div>

      {pestana === "datos" && (
        <Tarjeta>
          <dl className="grid sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            {[["Correo corporativo", e.email_corporativo], ["Teléfono", e.telefono ?? "—"], ["Supervisor", nombreEmpleado(e.supervisor)],
              ["Incorporación", fmtFecha(e.fecha_ingreso)], ["Tipo de contrato", e.tipo_contrato ?? "—"], ["Rol", etiquetaRol(e.rol_sistema, e.es_coordinador)]].map(([k, v]) => (
              <div key={k}><dt className="text-[11px] text-silver">{k}</dt><dd className="break-words">{v}</dd></div>
            ))}
          </dl>
        </Tarjeta>
      )}
      {pestana === "personales" && <DatosPersonales empleadoId={id} editable={gestiona || propio} />}
      {pestana === "actividades" && (
        <RecursoTabla recurso="tareas" fijos={{ responsable_id: id }} filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_TAREA }]}
          onAbrir={(f) => router.push(`/dashboard/planificacion?tarea=${f.id}`)}
          columnas={[{ clave: "titulo", titulo: "Actividad" }, { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_TAREA, f.estado as string)} color={color(ESTADOS_TAREA, f.estado as string)} /> },
            { clave: "fin", titulo: "Vence", render: (f) => fmtFecha(f.fin as string) }]} />
      )}
      {pestana === "evaluaciones" && (
        <RecursoTabla recurso="empleado_evaluaciones" fijos={{ empleado_id: id }} buscar={false} puedeCrear={gestiona && !propio} textoNuevo="Nueva evaluación"
          campos={[{ nombre: "periodo", etiqueta: "Período", tipo: "texto", requerido: true, ayuda: "p. ej. 2026-T3" },
            { nombre: "puntaje", etiqueta: "Puntaje (0-10)", tipo: "numero", min: 0, max: 10, paso: 0.1, requerido: true },
            { nombre: "comentarios", etiqueta: "Comentarios", tipo: "textarea" }]}
          columnas={[{ clave: "periodo", titulo: "Período" }, { clave: "puntaje", titulo: "Puntaje" },
            { clave: "evaluador", titulo: "Evaluador", render: (f) => nombreEmpleado(f.evaluador as { nombre: string; apellido: string } | null) },
            { clave: "comentarios", titulo: "Comentarios" }, { clave: "created_at", titulo: "Fecha", render: (f) => fmtFecha(f.created_at as string) }]} />
      )}
      {pestana === "documentos" && <Tarjeta titulo="Documentación autorizada"><Adjuntos entidad="empleado" entidadId={id} /></Tarjeta>}
      {pestana === "historial" && <Tarjeta><Historial entidad="empleados" entidadId={id} /></Tarjeta>}

      <Modal abierto={modal === "editar"} onCerrar={() => setModal(null)} titulo="Editar expediente">
        <Formulario campos={camposEmpleado(esAdmin, asignaRol && !propio)} inicial={e as unknown as Record<string, unknown>} editando onCancelar={() => setModal(null)}
          onGuardar={async (d) => { const r = await api<{ dato: Emp }>(`/api/gestion/empleados/${id}`, { method: "PATCH", json: d }); setE(r.dato); setModal(null); avisar("Expediente actualizado"); }} />
      </Modal>
      <Acceso abierto={modal === "acceso"} empleado={e} onCerrar={() => setModal(null)} onHecho={(c) => { setModal(null); setClave(c); cargar(); }} />
      <Desvincular abierto={modal === "desvincular"} empleado={e} onCerrar={() => setModal(null)} onHecho={() => { setModal(null); cargar(); }} />
      <Confirmar abierto={modal === "eliminar"} titulo="Eliminar expediente definitivamente" palabra={e.email_corporativo} accion="Eliminar"
        texto="Solo es posible si el empleado no tiene historial que deba conservarse (equipos, colaboraciones, evaluaciones). Las actividades y comentarios mantienen su registro sin autor."
        onCerrar={() => setModal(null)}
        onConfirmar={async (escrito) => {
          if (await intentar(() => api(`/api/gestion/personal/${id}?confirmar=${encodeURIComponent(escrito)}`, { method: "DELETE" }), "Expediente eliminado")) router.push("/dashboard/empleados");
        }} />
      <Modal abierto={!!clave} onCerrar={() => setClave(null)} titulo="Cuenta creada" ancho="max-w-md">
        <div className="space-y-3 text-sm">
          <p>Entrega esta contraseña temporal al empleado por un canal seguro. Se muestra una sola vez; debe cambiarla con «¿Olvidaste tu contraseña?» al ingresar.</p>
          <code className="block rounded-lg bg-black/40 px-3 py-2 text-cyan select-all break-all" translate="no">{clave}</code>
          <Button size="sm" onClick={() => setClave(null)}>Entendido</Button>
        </div>
      </Modal>
    </div>
  );
}

function Acceso({ abierto, empleado, onCerrar, onHecho }: { abierto: boolean; empleado: Emp; onCerrar: () => void; onHecho: (clave: string | null) => void }) {
  const { intentar } = useGestion();
  const [email, setEmail] = useState("");
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Dar acceso a la plataforma" ancho="max-w-md">
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-silver">Crear una cuenta nueva con el correo corporativo <span className="text-white">{empleado.email_corporativo}</span>.</p>
          <Button size="sm" onClick={async () => { const r = await intentar(() => api<{ claveTemporal: string | null }>(`/api/gestion/personal/${empleado.id}/acceso`, { method: "POST", json: { accion: "crear" } })); if (r) onHecho(r.claveTemporal); }}>Crear cuenta</Button>
        </div>
        <div className="border-t border-glass-bd pt-4 space-y-2">
          <p className="text-silver">O vincular una cuenta ya registrada:</p>
          <input className={campoCls} type="email" value={email} onChange={(x) => setEmail(x.target.value)} placeholder="correo@registrado.com" />
          <Button size="sm" variant="outline" disabled={!email} onClick={async () => { if (await intentar(() => api(`/api/gestion/personal/${empleado.id}/acceso`, { method: "POST", json: { accion: "vincular", email } }), "Cuenta vinculada")) onHecho(null); }}>Vincular</Button>
        </div>
      </div>
    </Modal>
  );
}

function Desvincular({ abierto, empleado, onCerrar, onHecho }: { abierto: boolean; empleado: Emp; onCerrar: () => void; onHecho: () => void }) {
  const { intentar } = useGestion();
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [reasignar, setReasignar] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Desvincular a ${nombreEmpleado(empleado)}`} ancho="max-w-lg">
      <div className="space-y-3 text-sm">
        <p className="text-silver">Se revocará su acceso, se cerrarán sus sesiones y sus actividades abiertas pasarán a quien indiques. Su historial y autoría se conservan.</p>
        <Etiqueta texto="Motivo" requerido><textarea rows={3} className={campoCls} value={motivo} onChange={(x) => setMotivo(x.target.value)} /></Etiqueta>
        <Etiqueta texto="Fecha de desvinculación"><input type="date" className={campoCls} value={fecha} onChange={(x) => setFecha(x.target.value)} /></Etiqueta>
        <Etiqueta texto="Reasignar actividades y tickets abiertos a">
          <SelectorRef recurso="empleados" value={reasignar} onChange={setReasignar} etiqueta={etqEmpleado} filtros={{ estado: "activo" }} placeholder="Dejar sin responsable" />
        </Etiqueta>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[#ff5370]" checked={ok} onChange={(x) => setOk(x.target.checked)} />Confirmo la desvinculación</label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCerrar}>Cancelar</Button>
          <Button variant="destructive" size="sm" disabled={!ok || motivo.trim().length < 3} onClick={async () => {
            const r = await intentar(() => api<{ tareas_reasignadas?: number; aviso?: string }>(`/api/gestion/personal/${empleado.id}/desvincular`, { method: "POST", json: { motivo, fecha, reasignar_a: reasignar } }));
            if (r) { onHecho(); }
          }}>Desvincular</Button>
        </div>
      </div>
    </Modal>
  );
}

function DatosPersonales({ empleadoId, editable }: { empleadoId: string; editable: boolean }) {
  const { intentar } = useGestion();
  const [datos, setDatos] = useState<Record<string, string> | null>(null);
  const [existe, setExiste] = useState(false);
  useEffect(() => {
    api<{ dato: { datos: Record<string, string> } }>(`/api/gestion/empleado_datos/${empleadoId}`)
      .then((r) => { setDatos(r.dato.datos); setExiste(true); }).catch(() => { setDatos({}); setExiste(false); });
  }, [empleadoId]);
  if (!datos) return <Cargando />;
  return (
    <Tarjeta titulo="Datos personales (confidencial)">
      <div className="grid sm:grid-cols-2 gap-3">
        {DATOS_PERSONALES.map(([k, t]) => (
          <Etiqueta key={k} texto={t}>
            <input className={campoCls} disabled={!editable} value={datos[k] ?? ""} type={k === "fecha_nacimiento" ? "date" : "text"}
              onChange={(x) => setDatos({ ...datos, [k]: x.target.value })} />
          </Etiqueta>
        ))}
      </div>
      {editable && (
        <Button size="sm" className="mt-3" onClick={async () => {
          const limpio = Object.fromEntries(Object.entries(datos).filter(([, v]) => v));
          const ok = await intentar(() => existe
            ? api(`/api/gestion/empleado_datos/${empleadoId}`, { method: "PATCH", json: { datos: limpio } })
            : api("/api/gestion/empleado_datos", { method: "POST", json: { empleado_id: empleadoId, datos: limpio } }), "Datos guardados");
          if (ok) setExiste(true);
        }}>Guardar</Button>
      )}
    </Tarjeta>
  );
}
