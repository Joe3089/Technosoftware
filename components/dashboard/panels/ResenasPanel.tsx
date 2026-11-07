"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ResenaCard, { type Resena } from "@/components/resenas/ResenaCard";
import { cn } from "@/lib/utils";
import { PanelShell, Estado } from "./proyectos/comun";

const ESTADO_LABEL = { pendiente: "Por revisar", publicada: "Publicada", oculta: "Oculta" } as const;

export default function ResenasPanel() {
  const { isAdmin } = useAuth(false);
  const [items, setItems] = useState<Resena[] | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setError(""); setItems(null);
    fetch(isAdmin ? "/api/resenas?todas=1" : "/api/resenas").then(async (r) => {
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setItems(j.resenas);
    }).catch((e) => setError(e.message || "No se pudieron cargar las reseñas"));
  }, [isAdmin]);
  useEffect(cargar, [cargar]);

  async function cambiar(id: string, estado: "publicada" | "oculta") {
    const r = await fetch(`/api/resenas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
    if (r.ok) setItems((xs) => xs?.map((x) => (x.id === id ? { ...x, estado } : x)) ?? null);
  }

  return (
    <PanelShell title="Reseñas" subtitle={isAdmin
      ? "Las reseñas llegan con la encuesta de cierre. Publica las que quieras mostrar en la web y en la app."
      : "Opiniones de clientes que ya recibieron su proyecto."}>
      <Estado loading={!items && !error} error={error} vacio={items?.length === 0} onRetry={cargar}
        mensajeVacio={isAdmin ? "Aún no hay reseñas." : "Pronto verás aquí las opiniones de nuestros clientes."} />
      {!!items?.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((r) => (
            <ResenaCard key={r.id} r={r}>
              {isAdmin && r.estado && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-bd pt-3">
                  <span className={cn("text-xs", r.estado === "publicada" ? "text-status-green" : r.estado === "oculta" ? "text-silver/60" : "text-cyan")}>
                    {ESTADO_LABEL[r.estado]}{r.proyecto ? ` · ${r.proyecto.nombre}` : ""}
                  </span>
                  <div className="flex gap-2">
                    {r.estado !== "publicada" && <button onClick={() => cambiar(r.id, "publicada")} className="px-3 py-1.5 rounded-lg border border-status-green/40 text-xs text-status-green">Publicar</button>}
                    {r.estado !== "oculta" && <button onClick={() => cambiar(r.id, "oculta")} className="px-3 py-1.5 rounded-lg border border-glass-bd text-xs text-silver">Ocultar</button>}
                  </div>
                </div>
              )}
            </ResenaCard>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
