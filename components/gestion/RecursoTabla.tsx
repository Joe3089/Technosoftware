"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion, useLista } from "./contexto";
import { Formulario, type Campo } from "./Formulario";
import { Buscador, Cargando, Confirmar, ErrorCaja, Modal, Paginacion, Selector, Vacio } from "./ui";
import type { Opcion } from "@/lib/gestion/constantes";

export type Fila = Record<string, unknown> & { id: string };
export interface Columna { clave: string; titulo: string; render?: (f: Fila) => React.ReactNode; orden?: string; clase?: string }
export interface Filtro { clave: string; etiqueta: string; opciones: Opcion[] }

/** Lista paginada con búsqueda, filtros, orden y formulario de alta/edición (vista tipo Odoo). */
export function RecursoTabla({
  recurso, titulo, columnas, campos, filtros = [], fijos = {}, puedeCrear, puedeEditar, puedeBorrar, textoNuevo = "Nuevo",
  nuevoInicial, onAbrir, acciones, size = 25, buscar = true, descripcionBorrar, cabecera, pk = "id",
}: {
  recurso: string; titulo?: string; columnas: Columna[]; campos?: Campo[]; filtros?: Filtro[]; fijos?: Record<string, string>;
  puedeCrear?: boolean; puedeEditar?: boolean | ((f: Fila) => boolean); puedeBorrar?: boolean | ((f: Fila) => boolean);
  textoNuevo?: string; nuevoInicial?: Record<string, unknown>; onAbrir?: (f: Fila) => void; acciones?: (f: Fila, recargar: () => void) => React.ReactNode;
  size?: number; buscar?: boolean; descripcionBorrar?: string; cabecera?: React.ReactNode; pk?: string;
}) {
  const { intentar } = useGestion();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [orden, setOrden] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [valoresFiltro, setValoresFiltro] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Fila | "nuevo" | null>(null);
  const [borrando, setBorrando] = useState<Fila | null>(null);

  const params: Record<string, string | number> = { q, page, size };
  if (orden) { params.orden = orden.col; params.dir = orden.dir; }
  for (const [k, v] of Object.entries({ ...valoresFiltro, ...fijos })) if (v) params[`f.${k}`] = v;
  const { datos, total, cargando, error, recargar } = useLista<Fila>(recurso, params);

  const ev = (p: boolean | ((f: Fila) => boolean) | undefined, f: Fila) => (typeof p === "function" ? p(f) : !!p);
  const guardar = async (d: Record<string, unknown>) => {
    if (editando === "nuevo") await api(`/api/gestion/${recurso}`, { method: "POST", json: { ...nuevoInicial, ...fijos, ...d } });
    else if (editando) await api(`/api/gestion/${recurso}/${encodeURIComponent(String(editando[pk]))}`, { method: "PATCH", json: d });
    setEditando(null);
    recargar();
  };

  return (
    <div className="space-y-3">
      {(titulo || cabecera || puedeCrear) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {titulo && <h2 className="font-ui font-semibold text-[#f0f4ff]">{titulo}</h2>}
          <div className="flex items-center gap-2 ml-auto">
            {cabecera}
            {puedeCrear && campos && <Button size="sm" onClick={() => setEditando("nuevo")}><Plus className="w-4 h-4" />{textoNuevo}</Button>}
          </div>
        </div>
      )}
      {(buscar || filtros.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {buscar && <Buscador valor={q} onCambio={(v) => { setQ(v); setPage(1); }} className="flex-1 min-w-[180px]" />}
          {filtros.map((f) => (
            <Selector key={f.clave} className="w-auto min-w-[140px]" value={valoresFiltro[f.clave] ?? ""} vacio={f.etiqueta} opciones={f.opciones}
              aria-label={f.etiqueta} onChange={(v) => { setValoresFiltro((x) => ({ ...x, [f.clave]: v })); setPage(1); }} />
          ))}
        </div>
      )}

      {error ? <ErrorCaja texto={error} /> : cargando && !datos.length ? <Cargando /> : !datos.length ? <Vacio texto="No hay registros." /> : (
        <div className="overflow-x-auto rounded-xl border border-glass-bd">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-silver text-xs">
              <tr>
                {columnas.map((c) => (
                  <th key={c.clave} className={cn("text-left font-ui font-semibold px-3 py-2 whitespace-nowrap", c.clase)}>
                    {c.orden ? (
                      <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => setOrden((o) => ({ col: c.orden!, dir: o?.col === c.orden && o?.dir === "asc" ? "desc" : "asc" }))}>
                        {c.titulo}{orden?.col === c.orden && (orden.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </button>
                    ) : c.titulo}
                  </th>
                ))}
                {(campos || puedeBorrar || acciones) && <th className="px-3 py-2 w-1"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody className={cn(cargando && "opacity-60")}>
              {datos.map((f) => (
                <tr key={String(f[pk] ?? JSON.stringify(f))} className={cn("border-t border-glass-bd/60 hover:bg-white/[0.03]", onAbrir && "cursor-pointer")} onClick={() => onAbrir?.(f)}>
                  {columnas.map((c) => <td key={c.clave} className={cn("px-3 py-2 align-top text-[#dbe5ff]", c.clase)}>{c.render ? c.render(f) : String(f[c.clave] ?? "—")}</td>)}
                  {(campos || puedeBorrar || acciones) && (
                    <td className="px-2 py-1.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {acciones?.(f, recargar)}
                      {campos && ev(puedeEditar, f) && <Button variant="link" size="icon" className="h-8 w-8 text-silver" onClick={() => setEditando(f)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>}
                      {ev(puedeBorrar, f) && <Button variant="link" size="icon" className="h-8 w-8 text-red-300" onClick={() => setBorrando(f)} aria-label="Eliminar"><Trash2 className="w-4 h-4" /></Button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion page={page} size={size} total={total} onPage={setPage} />

      {campos && (
        <Modal abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando === "nuevo" ? textoNuevo : "Editar"}>
          <Formulario campos={campos} inicial={editando === "nuevo" ? nuevoInicial : editando} editando={editando !== "nuevo"}
            onGuardar={guardar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
      <Confirmar abierto={!!borrando} titulo="Eliminar registro" onCerrar={() => setBorrando(null)} accion="Eliminar"
        texto={descripcionBorrar ?? "El registro se ocultará de las listas. El historial se conserva en la auditoría."}
        onConfirmar={async () => {
          const ok = await intentar(() => api(`/api/gestion/${recurso}/${encodeURIComponent(String(borrando![pk]))}`, { method: "DELETE" }), "Eliminado");
          if (ok) { setBorrando(null); recargar(); }
        }} />
    </div>
  );
}
