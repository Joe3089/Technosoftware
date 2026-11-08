"use client";

import { useRouter } from "next/navigation";
import { useGestion } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import { Chip, fmtFecha } from "@/components/management/ui";
import { CAMPOS_PROYECTO } from "@/components/management/proyectos/campos";
import { ESTADOS_PROYECTO, ETAPAS_PROYECTO, PRIORIDADES, color, etiqueta, nombreEmpleado } from "@/lib/services/constantes";
import { HistorialModulo } from "@/components/shared/Historial";

type P = Fila & { codigo: string; nombre: string; etapa: string; estado: string; prioridad: string; avance: number | null; fin_plan: string | null;
  cliente: { nombre: string } | null; coordinador: { nombre: string; apellido: string } | null };

export default function PaginaProyectos() {
  const { puede } = useGestion();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-ui font-bold text-xl">Proyectos</h1>
        <HistorialModulo titulo="Proyectos" entidades={["proyectos", "proyecto_equipo", "proyecto_hitos", "proyecto_items", "proyecto_contactos"]} />
      </div>
      <RecursoTabla recurso="proyectos" textoNuevo="Nuevo proyecto" campos={CAMPOS_PROYECTO} puedeCrear={puede("proyectos.gestionar")}
        nuevoInicial={{ prioridad: "media", etapa: "prospeccion", moneda: "USD" }}
        onAbrir={(f) => router.push(`/dashboard/proyectos/${f.id}`)}
        filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_PROYECTO }, { clave: "etapa", etiqueta: "Fase", opciones: ETAPAS_PROYECTO },
          { clave: "prioridad", etiqueta: "Prioridad", opciones: PRIORIDADES }]}
        columnas={[
          { clave: "codigo", titulo: "Código", orden: "codigo", render: (f) => <span className="text-cyan" translate="no">{(f as P).codigo}</span> },
          { clave: "nombre", titulo: "Proyecto", orden: "nombre", render: (f) => <span className="font-medium">{(f as P).nombre}</span> },
          { clave: "cliente", titulo: "Cliente", render: (f) => (f as P).cliente?.nombre ?? "—" },
          { clave: "etapa", titulo: "Fase", orden: "etapa", render: (f) => etiqueta(ETAPAS_PROYECTO, (f as P).etapa) },
          { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_PROYECTO, (f as P).estado)} color={color(ESTADOS_PROYECTO, (f as P).estado)} /> },
          { clave: "prioridad", titulo: "Prioridad", orden: "prioridad", render: (f) => <Chip texto={etiqueta(PRIORIDADES, (f as P).prioridad)} color={color(PRIORIDADES, (f as P).prioridad)} /> },
          { clave: "coordinador", titulo: "Coordinador", render: (f) => nombreEmpleado((f as P).coordinador) },
          { clave: "fin_plan", titulo: "Entrega", orden: "fin_plan", render: (f) => fmtFecha((f as P).fin_plan) },
          { clave: "avance", titulo: "Avance", render: (f) => (
            <span className="flex items-center gap-2 min-w-[90px]"><span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-cyan" style={{ width: `${(f as P).avance ?? 0}%` }} /></span><span className="text-xs" translate="no">{(f as P).avance ?? 0}%</span></span>
          ) },
        ]} />
    </div>
  );
}
