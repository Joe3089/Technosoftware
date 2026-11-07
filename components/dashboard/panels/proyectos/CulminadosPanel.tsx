"use client";

import { useState } from "react";
import { ChevronDown, Timer } from "lucide-react";
import { duracion } from "@/lib/proyectos";
import { cn } from "@/lib/utils";
import { PanelShell, useProyectos, Estado, EstadoBadge, Dato, CargarMas, Observaciones, cardStyle, fecha } from "./comun";

export default function CulminadosPanel() {
  const { items, total, hayMas, loading, error, masUno, recargar } = useProyectos("culminados");
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <PanelShell title="Proyectos Culminados" subtitle="Proyectos finalizados y su tiempo real de desarrollo.">
      {items.length > 0 && <p className="text-xs text-silver/60 -mt-3">Mostrando {items.length} de {total} · duración calculada entre la fecha real de inicio y la de culminación (UTC)</p>}
      {items.map((p) => {
        const d = duracion(p.fecha_inicio, p.fecha_fin);
        const open = abierto === p.id;
        return (
          <div key={p.id} className="rounded-2xl border border-glass-bd p-4 sm:p-5 flex flex-col gap-4" style={cardStyle}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-ui font-semibold text-[#f0f4ff]">{p.nombre}</p>
              <EstadoBadge estado={p.estado} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-glass-bd/70 px-4 py-3">
              <Timer className="w-5 h-5 text-cyan shrink-0" />
              <div>
                <p className="text-xs text-silver/60">Tiempo total de desarrollo</p>
                {d ? (
                  <p className="text-base font-ui font-semibold text-[#f0f4ff]">
                    {d.texto}{d.meses >= 1 && <span className="text-xs text-silver/70 font-normal"> · {d.dias} días</span>}
                  </p>
                ) : <p className="text-sm text-silver/70">No disponible (falta la fecha de inicio o de culminación)</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Dato label="Inicio">{fecha(p.fecha_inicio)}</Dato>
              <Dato label="Culminación">{fecha(p.fecha_fin)}</Dato>
              <Dato label="Responsable">{p.responsable || "Sin asignar"}</Dato>
              {p.cliente && <Dato label="Cliente">{p.cliente.full_name || p.cliente.email}</Dato>}
            </div>

            <button onClick={() => setAbierto(open ? null : p.id)} className="self-start flex items-center gap-1 text-xs font-ui text-blue-accent">
              Resumen de cierre <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open && <Observaciones proyectoId={p.id} soloCierre />}
          </div>
        );
      })}

      <Estado loading={loading} error={error} vacio={!items.length} onRetry={recargar}
        mensajeVacio="Aún no tienes proyectos culminados." />
      <CargarMas visible={hayMas && !loading && !error} onClick={masUno} />
    </PanelShell>
  );
}
