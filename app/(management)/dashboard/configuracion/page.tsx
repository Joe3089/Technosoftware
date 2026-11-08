"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import { Cargando, Chip, Etiqueta, Selector, SelectorRef, Tarjeta, Vacio, campoCls, fmtFechaHora } from "@/components/management/ui";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";
import { ESTADOS_TAREA, ESTADOS_TICKET, ETAPAS_CRM, ETAPAS_PROYECTO, PRIORIDADES, ROLES_SISTEMA, ROL_USUARIO, nombreEmpleado } from "@/lib/services/constantes";
import { HistorialModulo } from "@/components/shared/Historial";

const PESTANAS = { departamentos: "Departamentos", cargos: "Cargos", permisos: "Roles y permisos", catalogos: "Catálogos", parametros: "Parámetros", estados: "Estados y prioridades", auditoria: "Auditoría" };

export default function Configuracion() {
  const { esAdmin, sesion } = useGestion();
  const [pestana, setPestana] = useState<keyof typeof PESTANAS>("departamentos");
  if (!sesion) return <Cargando />;
  if (!esAdmin) return <Vacio texto="La configuración es exclusiva del administrador principal." />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-ui font-bold text-xl">Configuración</h1>
        <HistorialModulo titulo="Configuración" entidades={["departamentos", "cargos", "asignaciones_permiso", "catalogos", "parametros"]} />
      </div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
        {(Object.keys(PESTANAS) as (keyof typeof PESTANAS)[]).map((k) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={cn("px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px", pestana === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white")}>{PESTANAS[k]}</button>
        ))}
      </div>
      {pestana === "departamentos" && (
        <RecursoTabla recurso="departamentos" puedeCrear puedeEditar textoNuevo="Nuevo departamento" size={50}
          nuevoInicial={{ activo: true, orden: 0 }}
          campos={[{ nombre: "codigo", etiqueta: "Código", tipo: "texto", requerido: true, soloCrear: true, ayuda: "2-12 mayúsculas/números, p. ej. SOP" },
            { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
            { nombre: "padre_id", etiqueta: "Depende de", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.padre as { nombre?: string } | null)?.nombre },
            { nombre: "coordinador_id", etiqueta: "Coordinador", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.coordinador ? etqEmpleado(f.coordinador as Record<string, unknown>) : null) },
            { nombre: "orden", etiqueta: "Orden", tipo: "numero", min: 0 }, { nombre: "activo", etiqueta: "Activo", tipo: "bool" },
            { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }]}
          columnas={[{ clave: "codigo", titulo: "Código", render: (f) => <span translate="no" className="text-cyan">{String(f.codigo)}</span> }, { clave: "nombre", titulo: "Departamento" },
            { clave: "padre", titulo: "Depende de", render: (f) => (f.padre as { nombre?: string } | null)?.nombre ?? "—" },
            { clave: "coordinador", titulo: "Coordinador", render: (f) => nombreEmpleado(f.coordinador as { nombre: string; apellido: string } | null) },
            { clave: "activo", titulo: "Estado", render: (f) => <Chip texto={f.activo ? "Activo" : "Inactivo"} color={f.activo ? "#00e676" : "#5c6b8a"} /> }]} />
      )}
      {pestana === "cargos" && (
        <RecursoTabla recurso="cargos" puedeCrear puedeEditar puedeBorrar textoNuevo="Nuevo cargo" nuevoInicial={{ activo: true }}
          descripcionBorrar="Solo se elimina si ningún empleado lo tiene asignado; si no, desactívalo."
          campos={[{ nombre: "nombre", etiqueta: "Cargo", tipo: "texto", requerido: true },
            { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
            { nombre: "activo", etiqueta: "Activo", tipo: "bool" }, { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" }]}
          columnas={[{ clave: "nombre", titulo: "Cargo" }, { clave: "departamento", titulo: "Departamento", render: (f) => (f.departamento as { nombre?: string } | null)?.nombre ?? "—" },
            { clave: "activo", titulo: "Estado", render: (f) => <Chip texto={f.activo ? "Activo" : "Inactivo"} color={f.activo ? "#00e676" : "#5c6b8a"} /> }]} />
      )}
      {pestana === "permisos" && <Permisos />}
      {pestana === "catalogos" && <Catalogos />}
      {pestana === "parametros" && (
        <RecursoTabla recurso="parametros" pk="clave" buscar={false} puedeEditar
          campos={[{ nombre: "valor", etiqueta: "Valor", tipo: "texto", requerido: true }]}
          columnas={[{ clave: "clave", titulo: "Parámetro", render: (f) => <span translate="no">{String(f.clave)}</span> }, { clave: "descripcion", titulo: "Descripción" },
            { clave: "valor", titulo: "Valor", render: (f) => <span translate="no">{JSON.stringify(f.valor)}</span> }]} />
      )}
      {pestana === "estados" && (
        <Tarjeta titulo="Estados y prioridades del sistema">
          <p className="text-xs text-silver mb-3">Son fijos porque las vistas Kanban/Gantt, las reglas de la base de datos y los KPI dependen de ellos. Las categorías, fuentes y tipos de contrato sí se configuran en «Catálogos».</p>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[["Actividades", ESTADOS_TAREA], ["Prioridades", PRIORIDADES], ["Tickets", ESTADOS_TICKET], ["Pipeline CRM", ETAPAS_CRM], ["Fases de proyecto", ETAPAS_PROYECTO]].map(([t, o]) => (
              <div key={t as string}><p className="text-xs text-silver mb-1">{t as string}</p><div className="flex flex-wrap gap-1.5">{(o as typeof ESTADOS_TAREA).map((x) => <Chip key={x.valor} texto={x.etiqueta} color={x.color} />)}</div></div>
            ))}
          </div>
        </Tarjeta>
      )}
      {pestana === "auditoria" && <Auditoria />}
    </div>
  );
}

type Asig = { id: string; sujeto_tipo: string; sujeto_id: string; permiso: string; concedido: boolean };
type Permiso = { codigo: string; modulo: string; descripcion: string };
function Permisos() {
  const { intentar } = useGestion();
  const [tipo, setTipo] = useState("rol");
  const [sujeto, setSujeto] = useState<string | null>("devops");
  const permisos = useLista<Permiso & { id: string }>("permisos", { size: 200 });
  const asig = useLista<Asig>(sujeto ? "asignaciones_permiso" : null, { "f.sujeto_tipo": tipo, "f.sujeto_id": sujeto ?? "", size: 200 });
  const modulos = useMemo(() => {
    const m = new Map<string, Permiso[]>();
    for (const p of permisos.datos) m.set(p.modulo, [...(m.get(p.modulo) ?? []), p]);
    return [...m.entries()];
  }, [permisos.datos]);

  async function fijar(p: string, estado: "hereda" | "concede" | "deniega") {
    const actual = asig.datos.find((a) => a.permiso === p);
    if (actual) await api(`/api/gestion/asignaciones_permiso/${actual.id}`, { method: "DELETE" });
    if (estado !== "hereda") await api("/api/gestion/asignaciones_permiso", { method: "POST", json: { sujeto_tipo: tipo, sujeto_id: sujeto, permiso: p, concedido: estado === "concede" } });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100 flex gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Los permisos efectivos combinan rol interno + departamento (las sub-áreas heredan de su área) + cargo + excepciones por empleado. Una denegación por empleado prevalece. La configuración y la asignación de roles son exclusivas del administrador principal.</span>
      </div>
      <div className="grid sm:grid-cols-[200px_1fr] gap-3 max-w-2xl">
        <Etiqueta texto="Asignar a">
          <Selector value={tipo} onChange={(v) => { setTipo(v); setSujeto(v === "rol" ? "devops" : v === "coordinador" ? "*" : null); }}
            opciones={[{ valor: "rol", etiqueta: "Rol" }, { valor: "coordinador", etiqueta: "Coordinadores de un rol" }, { valor: "departamento", etiqueta: "Departamento" }, { valor: "cargo", etiqueta: "Cargo" }, { valor: "empleado", etiqueta: "Empleado (excepción)" }]} />
        </Etiqueta>
        <Etiqueta texto="Sujeto">
          {tipo === "rol" ? <Selector value={sujeto ?? ""} onChange={setSujeto} opciones={ROLES_SISTEMA.filter((r) => r.valor !== "admin_general")} />
            : tipo === "coordinador" ? <Selector value={sujeto ?? "*"} onChange={setSujeto} opciones={[{ valor: "*", etiqueta: "Cualquier coordinador" }, ...ROLES_SISTEMA.filter((r) => r.valor !== "admin_general")]} />
            : <SelectorRef recurso={tipo === "departamento" ? "departamentos" : tipo === "cargo" ? "cargos" : "empleados"} value={sujeto} onChange={setSujeto}
                etiqueta={tipo === "empleado" ? etqEmpleado : (f) => String(f.nombre)} placeholder="Selecciona…" />}
        </Etiqueta>
      </div>
      {!sujeto ? <Vacio texto="Selecciona a quién asignar permisos." /> : asig.cargando || permisos.cargando ? <Cargando /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {modulos.map(([mod, lista]) => (
            <Tarjeta key={mod} titulo={mod}>
              <ul className="space-y-2">
                {lista.map((p) => {
                  const a = asig.datos.find((x) => x.permiso === p.codigo);
                  const estado = !a ? "hereda" : a.concedido ? "concede" : "deniega";
                  return (
                    <li key={p.codigo} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex-1">{p.descripcion}</span>
                        <select value={estado} aria-label={p.descripcion} className={cn(campoCls, "w-auto py-1 text-xs", estado === "concede" && "text-status-green", estado === "deniega" && "text-red-300")}
                          onChange={async (e) => { if (await intentar(() => fijar(p.codigo, e.target.value as "hereda"), "Permiso actualizado") !== null) asig.recargar(); }}>
                          <option value="hereda" className="bg-[#0b1430]">{tipo === "empleado" ? "Heredado" : "No asignado"}</option>
                          <option value="concede" className="bg-[#0b1430]">Concedido</option>
                          {tipo === "empleado" && <option value="deniega" className="bg-[#0b1430]">Denegado</option>}
                        </select>
                      </div>
                      <code className="text-[10px] text-silver/50" translate="no">{p.codigo}</code>
                    </li>
                  );
                })}
              </ul>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}

function Catalogos() {
  const [tipo, setTipo] = useState("categoria_ticket");
  const TIPOS = [["categoria_ticket", "Categorías de tickets"], ["categoria_gasto", "Categorías de gasto"], ["categoria_ingreso", "Categorías de ingreso"],
    ["tipo_contrato", "Tipos de contrato"], ["fuente_crm", "Fuentes de leads"]].map(([valor, etiqueta]) => ({ valor, etiqueta }));
  return (
    <div className="space-y-3">
      <Selector className="max-w-xs" value={tipo} onChange={setTipo} opciones={TIPOS} aria-label="Catálogo" />
      <RecursoTabla key={tipo} recurso="catalogos" fijos={{ tipo }} buscar={false} puedeCrear puedeEditar puedeBorrar textoNuevo="Nuevo valor"
        nuevoInicial={{ activo: true, orden: 0 }} descripcionBorrar="El valor dejará de ofrecerse. Los registros que ya lo usan lo conservan."
        campos={[{ nombre: "valor", etiqueta: "Valor", tipo: "texto", requerido: true }, { nombre: "orden", etiqueta: "Orden", tipo: "numero", min: 0 }, { nombre: "activo", etiqueta: "Activo", tipo: "bool" }]}
        columnas={[{ clave: "valor", titulo: "Valor" }, { clave: "orden", titulo: "Orden" },
          { clave: "activo", titulo: "Estado", render: (f: Fila) => <Chip texto={f.activo ? "Activo" : "Inactivo"} color={f.activo ? "#00e676" : "#5c6b8a"} /> }]} />
    </div>
  );
}

type Ev = { id: number; actor_id: string | null; accion: string; entidad: string; entidad_id: string | null; cambios: Record<string, unknown> | null; created_at: string };
function Auditoria() {
  const [entidad, setEntidad] = useState("");
  const [page, setPage] = useState(1);
  const { datos, total, cargando } = useLista<Ev>("auditoria", { "f.entidad": entidad, page, size: 50 });
  const [actores, setActores] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = [...new Set(datos.map((d) => d.actor_id).filter(Boolean))].filter((x) => !actores[x!]);
    if (ids.length) api<{ datos: { profile_id: string; nombre: string; apellido: string }[] }>(`/api/gestion/empleados?size=200`)
      .then((r) => setActores((a) => ({ ...a, ...Object.fromEntries(r.datos.filter((e) => e.profile_id).map((e) => [e.profile_id, `${e.nombre} ${e.apellido}`])) }))).catch(() => null);
  }, [datos, actores]);
  const ENT = ["tareas", "proyectos", "empleados", "asignaciones_permiso", "clientes", "contactos", "oportunidades", "facturas", "pagos_factura", "finanzas_registros", "movimientos", "tickets", "profiles", "departamentos"];
  return (
    <div className="space-y-3">
      <Selector className="max-w-xs" value={entidad} onChange={(v) => { setEntidad(v); setPage(1); }} vacio="Todas las entidades" opciones={ENT.map((e) => ({ valor: e, etiqueta: e }))} aria-label="Entidad" />
      {cargando ? <Cargando /> : (
        <div className="overflow-x-auto rounded-xl border border-glass-bd">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.03] text-silver"><tr><th className="text-left px-3 py-2">Fecha</th><th className="text-left px-3">Usuario</th><th className="text-left px-3">Acción</th><th className="text-left px-3">Entidad</th><th className="text-left px-3">Cambios</th></tr></thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.id} className="border-t border-glass-bd/60 align-top">
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtFechaHora(d.created_at)}</td>
                  <td className="px-3 py-1.5">{d.actor_id ? actores[d.actor_id] ?? "Administrador / cliente" : "Sistema"}</td>
                  <td className="px-3 py-1.5">{d.accion}</td>
                  <td className="px-3 py-1.5" translate="no">{d.entidad}<span className="block text-silver/50">{d.entidad_id?.slice(0, 8)}</span></td>
                  <td className="px-3 py-1.5 text-silver max-w-md break-words" translate="no">{d.cambios ? Object.keys(d.cambios).join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2 items-center text-xs text-silver">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span translate="no">{page} / {Math.max(1, Math.ceil(total / 50))}</span>
        <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}
