"use client";

import { Suspense } from "react";
import Actividades from "@/components/planning/Actividades";
import { Cargando } from "@/components/management/ui";
import { HistorialModulo } from "@/components/shared/Historial";

export default function PaginaActividades() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-ui font-bold text-xl">Planificación y actividades</h1>
        <HistorialModulo titulo="Planificación" entidades={["tareas", "tarea_checklist", "tarea_comentarios", "tarea_colaboradores", "tarea_dependencias"]} />
      </div>
      <Suspense fallback={<Cargando />}><Actividades /></Suspense>
    </div>
  );
}
