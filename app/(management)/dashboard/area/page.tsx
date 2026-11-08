"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useGestion } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import type { Campo } from "@/components/management/Formulario";
import { Chip, Modal, Selector, Tarjeta, Vacio, fmtFecha, fmtFechaHora } from "@/components/management/ui";
import { Adjuntos } from "@/components/shared/Adjuntos";
import { Historial, HistorialModulo } from "@/components/shared/Historial";
import { etqEmpleado } from "@/components/planning/comun";
import { etqCliente } from "@/components/management/proyectos/campos";
import { AREAS, ESTADOS_DOC, TIPOS_DOC, tiposDeArea, type TipoDoc } from "@/lib/services/areas";
import { color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";

// Los campos «d_*» viven en documentos_area.datos: se aplanan para el formulario y se reagrupan al guardar
const aplanar = (f: Fila) => ({ ...f, ...Object.fromEntries(Object.entries((f.datos as Record<string, unknown>) ?? {}).map(([k, v]) => [`d_${k}`, v])) });

function camposDe(t: TipoDoc): Campo[] {
  return [
    { nombre: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, completo: true },
    ...(t.proyecto ? [{ nombre: "proyecto_id", etiqueta: "Proyecto", tipo: "ref", recurso: "proyectos", requerido: t.proyecto === "requerido",
      refEtiqueta: (f: Record<string, unknown>) => `${f.codigo} · ${f.nombre}`, refInicial: (f: Record<string, unknown>) => (f.proyecto as { nombre?: string } | null)?.nombre } as Campo] : []),
    ...(t.cliente ? [{ nombre: "cliente_id", etiqueta: "Cliente", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, refInicial: (f: Record<string, unknown>) => (f.cliente as { nombre?: string } | null)?.nombre } as Campo] : []),
    ...(t.campos ?? []).map((c) => ({ ...c } as Campo)),
    ...(t.fecha ? [{ nombre: "fecha", etiqueta: t.fecha, tipo: "fechahora" } as Campo] : []),
    ...(t.responsable ? [{ nombre: "responsable_id", etiqueta: t.responsable, tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" },
      refInicial: (f: Record<string, unknown>) => (f.responsable ? etqEmpleado(f.responsable as Record<string, unknown>) : null) } as Campo] : []),
    { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: ESTADOS_DOC.filter((e) => t.estados.includes(e.valor)), requerido: true },
    { nombre: "contenido", etiqueta: "Contenido", tipo: "textarea" },
  ];
}

/** Envía «d_*» dentro de «datos» (la API genérica valida la forma). */
function agrupar(d: Record<string, unknown>, previo?: Record<string, unknown>) {
  const datos: Record<string, unknown> = { ...((previo?.datos as Record<string, unknown>) ?? {}) };
  const resto: Record<string, unknown> = {};
  let hay = false;
  for (const [k, v] of Object.entries(d)) if (k.startsWith("d_")) { hay = true; if (v === null || v === "") delete datos[k.slice(2)]; else datos[k.slice(2)] = v; } else resto[k] = v;
  return hay ? { ...resto, datos } : resto;
}

export default function MiArea() {
  const { sesion, esAdmin } = useGestion();
  const coordinador = esAdmin || !!sesion?.coordinador;
  const [area, setArea] = useState<string>("");
  useEffect(() => { if (sesion) setArea(esAdmin ? "consultoria" : sesion.rol ?? ""); }, [sesion, esAdmin]);
  const tipos = useMemo(() => tiposDeArea(area).filter(([, t]) => coordinador || !t.coord), [area, coordinador]);
  const [tipo, setTipo] = useState<string>("comunicados");
  useEffect(() => { setTipo(tipos[0]?.[0] ?? "comunicados"); }, [tipos]);
  const [abierto, setAbierto] = useState<Fila | null>(null);

  if (!sesion) return null;
  const info = AREAS[area];
  const t = TIPOS_DOC[tipo];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-ui font-bold text-xl">{info ? `Mi área · ${info.nombre}` : "Mi área"}{sesion.coordinador && " (coordinación)"}</h1>
          {info && <p className="text-sm text-silver">{info.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2">
          {esAdmin && <Selector className="w-48" value={area} onChange={setArea} aria-label="Área" opciones={Object.entries(AREAS).map(([valor, a]) => ({ valor, etiqueta: a.nombre }))} />}
          <HistorialModulo titulo="Documentos de área" entidades={["documentos_area"]} />
        </div>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
        {[...tipos.map(([k, x]) => [k, x.etiqueta] as const), ["comunicados", "Bienestar y comunicados"] as const].map(([k, et]) => (
          <button key={k} role="tab" aria-selected={tipo === k} onClick={() => setTipo(k)}
            className={cn("px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px", tipo === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white")}>{et}</button>
        ))}
      </div>

      {area === "finanzas" && tipo === "comunicados" && (
        <Tarjeta><p className="text-sm text-silver">El trabajo de Finanzas está en <Link href="/dashboard/contabilidad?tab=pagos" className="text-blue-accent hover:underline">Contabilidad → Verificación de pagos</Link>{coordinador && <> y en el resumen, facturas y billetera de <Link href="/dashboard/contabilidad" className="text-blue-accent hover:underline">Contabilidad</Link></>}.</p></Tarjeta>
      )}

      {tipo === "comunicados" ? (
        <RecursoTabla key="comunicados" recurso="documentos_area" fijos={{ tipo: "bienestar,contenido", estado: "publicado" }} onAbrir={setAbierto}
          columnas={[{ clave: "titulo", titulo: "Publicación", render: (f) => <span className="font-medium">{String(f.titulo)}</span> },
            { clave: "tipo", titulo: "Tipo", render: (f) => TIPOS_DOC[f.tipo as string]?.etiqueta ?? String(f.tipo) },
            { clave: "fecha", titulo: "Fecha", render: (f) => (f.fecha ? fmtFechaHora(f.fecha as string) : fmtFecha(f.created_at as string)) }]} />
      ) : !t ? <Vacio texto="Esta área no tiene documentos propios." /> : (
        <div className="space-y-2">
          <p className="text-xs text-silver">{t.descripcion}{t.coord ? " Solo la coordinación del área." : ""}</p>
          <RecursoTabla key={`${area}-${tipo}`} recurso="documentos_area" fijos={{ area, tipo }} campos={camposDe(t)} puedeCrear puedeEditar
            puedeBorrar={(f) => f.estado === "borrador"} descripcionBorrar="Se eliminará el borrador (queda en el historial)."
            textoNuevo={`Nuevo: ${t.etiqueta.toLowerCase()}`} nuevoInicial={{ estado: t.estados[0], area, tipo }} onAbrir={setAbierto}
            filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_DOC.filter((e) => t.estados.includes(e.valor)) }]}
            transformar={{ entrada: aplanar, salida: agrupar }}
            columnas={[
              { clave: "titulo", titulo: "Título", orden: "titulo", render: (f) => <span className="font-medium">{String(f.titulo)}</span> },
              { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_DOC, f.estado as string)} color={color(ESTADOS_DOC, f.estado as string)} /> },
              ...(t.proyecto ? [{ clave: "proyecto", titulo: "Proyecto", render: (f: Fila) => (f.proyecto as { codigo?: string } | null)?.codigo ?? "—" }] : []),
              ...(t.fecha ? [{ clave: "fecha", titulo: t.fecha, orden: "fecha", render: (f: Fila) => fmtFechaHora(f.fecha as string) }] : []),
              ...(t.responsable ? [{ clave: "responsable", titulo: t.responsable, render: (f: Fila) => nombreEmpleado(f.responsable as { nombre: string; apellido: string } | null) }] : []),
              { clave: "autor", titulo: "Autor", render: (f) => nombreEmpleado(f.autor as { nombre: string; apellido: string } | null) },
              { clave: "created_at", titulo: "Creado", orden: "created_at", render: (f) => fmtFecha(f.created_at as string) },
            ]} />
        </div>
      )}

      <Modal abierto={!!abierto} onCerrar={() => setAbierto(null)} titulo={String(abierto?.titulo ?? "")} ancho="max-w-3xl"
        descripcion={abierto ? `${TIPOS_DOC[abierto.tipo as string]?.etiqueta ?? ""} · ${etiqueta(ESTADOS_DOC, abierto.estado as string)}` : undefined}>
        {abierto && (
          <div className="space-y-4 text-sm">
            {Object.keys((abierto.datos as object) ?? {}).length > 0 && (
              <dl className="grid sm:grid-cols-2 gap-2">
                {Object.entries(abierto.datos as Record<string, unknown>).map(([k, v]) => {
                  const campo = TIPOS_DOC[abierto.tipo as string]?.campos?.find((c) => c.nombre === `d_${k}`);
                  return <div key={k}><dt className="text-[11px] text-silver">{campo?.etiqueta ?? k}</dt><dd>{campo?.opciones ? etiqueta(campo.opciones, String(v)) : String(v)}</dd></div>;
                })}
              </dl>
            )}
            {abierto.contenido ? <p className="whitespace-pre-wrap text-silver">{String(abierto.contenido)}</p> : null}
            <section className="border-t border-glass-bd pt-3 space-y-2"><h3 className="text-xs font-ui text-silver">Archivos</h3><Adjuntos entidad="documento" entidadId={abierto.id} /></section>
            <section className="border-t border-glass-bd pt-3 space-y-2"><h3 className="text-xs font-ui text-silver">Historial</h3><Historial entidad="documentos_area" entidadId={abierto.id} /></section>
          </div>
        )}
      </Modal>
    </div>
  );
}
