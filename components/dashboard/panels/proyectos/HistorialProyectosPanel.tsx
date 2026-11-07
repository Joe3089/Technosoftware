"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GRUPOS, type Grupo } from "@/lib/proyectos";
import { cn } from "@/lib/utils";
import { PanelShell, useProyectos, Estado, EstadoBadge, Dato, CargarMas, cardStyle, fecha } from "./comun";

export default function HistorialProyectosPanel() {
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const { items, total, conteos, hayMas, loading, error, masUno, recargar } = useProyectos(grupo, q);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const todos = Object.values(conteos).reduce((a, b) => a + b, 0);
  const chip = (id: Grupo | null, label: string, n?: number) => (
    <button key={label} onClick={() => setGrupo(id)}
      className={cn("px-3 py-1.5 rounded-full text-xs font-ui border transition-colors",
        grupo === id ? "border-blue-accent/60 bg-blue-accent/20 text-[#f0f4ff]" : "border-glass-bd text-silver hover:text-white")}>
      {label}{n !== undefined && <span className="ml-1.5 text-silver/70">{n}</span>}
    </button>
  );

  return (
    <PanelShell title="Historial de Proyectos" subtitle="Todos tus proyectos, organizados por su estado.">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver/50" />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre…" className="pl-9" aria-label="Buscar proyecto" />
        </div>
        <div className="flex flex-wrap gap-2">
          {chip(null, "Todos", todos)}
          {(Object.keys(GRUPOS) as Grupo[]).map((g) => chip(g, GRUPOS[g].label, conteos[g]))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-silver/60">Mostrando {items.length} de {total}</p>
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-glass-bd p-4 sm:p-5 flex flex-col gap-3" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-ui font-semibold text-[#f0f4ff]">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-silver/70 mt-0.5 line-clamp-2">{p.descripcion}</p>}
                </div>
                <EstadoBadge estado={p.estado} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Dato label="Inicio">{fecha(p.fecha_inicio)}</Dato>
                <Dato label="Culminación">{p.estado === "completado" ? fecha(p.fecha_fin) : "—"}</Dato>
                <Dato label="Responsable">{p.responsable || "Sin asignar"}</Dato>
                {p.cliente && <Dato label="Cliente">{p.cliente.full_name || p.cliente.email}</Dato>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Estado loading={loading} error={error} vacio={!items.length} onRetry={recargar}
        mensajeVacio={q ? "Ningún proyecto coincide con la búsqueda." : "No hay proyectos en esta categoría."} />
      <CargarMas visible={hayMas && !loading && !error} onClick={masUno} />
    </PanelShell>
  );
}
