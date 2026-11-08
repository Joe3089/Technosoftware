"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Opcion } from "@/lib/gestion/constantes";
import { listar } from "./contexto";
import { campoCls, Etiqueta, ErrorCaja, Selector, SelectorRef } from "./ui";

type Fila = Record<string, unknown>;
export interface Campo {
  nombre: string;
  etiqueta: string;
  tipo: "texto" | "email" | "textarea" | "numero" | "fecha" | "fechahora" | "opciones" | "ref" | "bool";
  opciones?: Opcion[];
  catalogo?: string;                              // opciones desde public.catalogos (tipo)
  recurso?: string;                               // para tipo ref
  refEtiqueta?: (f: Fila) => string;
  refInicial?: (fila: Fila) => string | null | undefined;
  refFiltros?: Record<string, string>;
  requerido?: boolean;
  completo?: boolean;                             // ocupa las dos columnas
  soloCrear?: boolean;
  soloEditar?: boolean;
  min?: number; max?: number; paso?: number;
  ayuda?: string;
  visible?: (v: Fila) => boolean;
}

const catalogoCache = new Map<string, Promise<Opcion[]>>();
function opcionesCatalogo(tipo: string) {
  if (!catalogoCache.has(tipo))
    catalogoCache.set(tipo, listar<{ valor: string }>("catalogos", { "f.tipo": tipo, "f.activo": true, size: 200 })
      .then((r) => r.datos.map((d) => ({ valor: d.valor, etiqueta: d.valor })))
      .catch(() => { catalogoCache.delete(tipo); return []; }));
  return catalogoCache.get(tipo)!;
}

const aEntrada = (c: Campo, v: unknown) => {
  if (v == null) return c.tipo === "bool" ? false : "";
  if (c.tipo === "fechahora" && typeof v === "string") {
    const d = new Date(v); const z = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - z).toISOString().slice(0, 16);
  }
  return v;
};
const aSalida = (c: Campo, v: unknown) => {
  if (c.tipo === "bool") return !!v;
  if (v === "" || v == null) return null;
  if (c.tipo === "numero") return Number(v);
  if (c.tipo === "fechahora") return new Date(String(v)).toISOString();
  return v;
};

export function Formulario({ campos, inicial, editando, onGuardar, onCancelar, textoGuardar = "Guardar" }: {
  campos: Campo[]; inicial?: Fila | null; editando?: boolean; textoGuardar?: string;
  onGuardar: (datos: Fila) => Promise<unknown>; onCancelar: () => void;
}) {
  const visibles = useMemo(() => campos.filter((c) => (editando ? !c.soloCrear : !c.soloEditar)), [campos, editando]);
  const base = useMemo(() => Object.fromEntries(visibles.map((c) => [c.nombre, aEntrada(c, inicial?.[c.nombre])])), [visibles, inicial]);
  const [v, setV] = useState<Fila>(base);
  const [cats, setCats] = useState<Record<string, Opcion[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => setV(base), [base]);
  useEffect(() => {
    for (const c of visibles) if (c.catalogo && !cats[c.catalogo])
      opcionesCatalogo(c.catalogo).then((o) => setCats((x) => ({ ...x, [c.catalogo!]: o })));
  }, [visibles, cats]);

  const set = (k: string, val: unknown) => setV((x) => ({ ...x, [k]: val }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const faltan = visibles.filter((c) => c.requerido && (c.visible?.(v) ?? true) && (v[c.nombre] === "" || v[c.nombre] == null));
    if (faltan.length) return setError(`Completa: ${faltan.map((c) => c.etiqueta).join(", ")}`);
    const datos: Fila = {};
    for (const c of visibles) {
      if (!(c.visible?.(v) ?? true)) continue;
      const salida = aSalida(c, v[c.nombre]);
      // Al editar solo se envía lo que cambió (evita disparar reglas sobre campos intactos)
      if (editando && JSON.stringify(salida) === JSON.stringify(aSalida(c, base[c.nombre]))) continue;
      datos[c.nombre] = salida;
    }
    if (editando && !Object.keys(datos).length) return onCancelar();
    setOcupado(true);
    try { await onGuardar(datos); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar"); }
    finally { setOcupado(false); }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibles.filter((c) => c.visible?.(v) ?? true).map((c) => (
          <Etiqueta key={c.nombre} texto={c.etiqueta} requerido={c.requerido} className={cn((c.completo || c.tipo === "textarea") && "sm:col-span-2")}>
            {c.tipo === "textarea" ? (
              <textarea rows={4} className={campoCls} value={String(v[c.nombre] ?? "")} onChange={(e) => set(c.nombre, e.target.value)} />
            ) : c.tipo === "opciones" || c.catalogo ? (
              <Selector value={String(v[c.nombre] ?? "")} onChange={(x) => set(c.nombre, x)} vacio={c.requerido ? undefined : "—"}
                opciones={c.catalogo ? cats[c.catalogo] ?? [] : c.opciones ?? []} />
            ) : c.tipo === "ref" ? (
              <SelectorRef recurso={c.recurso!} value={(v[c.nombre] as string) || null} onChange={(id) => set(c.nombre, id ?? "")}
                etiqueta={c.refEtiqueta ?? ((f) => String(f.nombre ?? f.titulo ?? f.id))} inicial={inicial ? c.refInicial?.(inicial) : null} filtros={c.refFiltros} />
            ) : c.tipo === "bool" ? (
              <input type="checkbox" className="w-4 h-4 accent-[#4d7fff]" checked={!!v[c.nombre]} onChange={(e) => set(c.nombre, e.target.checked)} />
            ) : (
              <input className={campoCls} value={String(v[c.nombre] ?? "")} onChange={(e) => set(c.nombre, e.target.value)}
                type={{ texto: "text", email: "email", numero: "number", fecha: "date", fechahora: "datetime-local" }[c.tipo as "texto"] ?? "text"}
                min={c.min} max={c.max} step={c.paso ?? (c.tipo === "numero" ? "any" : undefined)} />
            )}
            {c.ayuda && <span className="text-[11px] text-silver/60">{c.ayuda}</span>}
          </Etiqueta>
        ))}
      </div>
      {error && <ErrorCaja texto={error} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={ocupado}>{ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{textoGuardar}</Button>
      </div>
    </form>
  );
}
