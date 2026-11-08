"use client";

import { Suspense } from "react";
import Actividades from "@/components/planning/Actividades";
import { Cargando } from "@/components/management/ui";

export default function PaginaActividades() {
  return (
    <div className="space-y-4">
      <h1 className="font-ui font-bold text-xl">Planificación y actividades</h1>
      <Suspense fallback={<Cargando />}><Actividades /></Suspense>
    </div>
  );
}
