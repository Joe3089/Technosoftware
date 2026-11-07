"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cardStyle } from "./campos";

const ESTADO: Record<string, string> = {
  recibida: "Recibida", en_revision: "En revisión", respondida: "Respondida", cerrada: "Cerrada",
  pendiente_revision: "Pendiente de revisión", aprobada: "Aprobada", rechazada: "Rechazada",
  pendiente_confirmacion: "Pendiente de confirmación", confirmada: "Confirmada", reprogramar: "Por reprogramar", cancelada: "Cancelada",
};
export const estadoLabel = (e: string) => ESTADO[e] ?? e;

export interface Enviado { codigo: string; estado: string; reunion: { estado: string } | null; fallidos: string[] }

export function Confirmacion({ titulo, r, onNueva }: { titulo: string; r: Enviado; onNueva: () => void }) {
  return (
    <div className="rounded-2xl border border-status-green/30 p-6 flex flex-col gap-4" style={cardStyle} role="status">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-8 h-8 text-status-green shrink-0" />
        <div>
          <p className="font-ui font-semibold text-[#f0f4ff]">{titulo}</p>
          <p className="text-sm text-silver">Código de seguimiento: <span className="font-mono text-cyan">{r.codigo}</span></p>
        </div>
      </div>
      <ul className="text-sm text-silver flex flex-col gap-1.5">
        <li>Estado: <strong className="text-[#f0f4ff]">{estadoLabel(r.estado)}</strong></li>
        {r.reunion && (
          <li className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-yellow-400" />
            Reunión: <strong className="text-yellow-400">{estadoLabel(r.reunion.estado)}</strong> — el consultor la confirmará contigo.</li>
        )}
      </ul>
      {r.fallidos.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          La solicitud se guardó, pero no se pudieron subir: {r.fallidos.join(", ")}. Puedes enviarlos al consultor más adelante.
        </p>
      )}
      <button onClick={onNueva} className="self-start px-4 py-2 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5">
        Enviar otra solicitud
      </button>
    </div>
  );
}

interface Item { id: string; codigo: string; estado: string; created_at: string; objetivo?: string; nombre?: string; proyecto?: { nombre: string } | null; reunion?: { estado: string } | null }

export function MisSolicitudes({ url, version }: { url: string; version: number }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => setItems(j.items)).catch(() => setError(true));
  }, [url, version]);
  if (error || !items?.length) return null;
  const f = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
  return (
    <div className="rounded-2xl border border-glass-bd p-4 sm:p-6" style={cardStyle}>
      <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/50 mb-2">Mis solicitudes</p>
      <ul>
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-t border-glass-bd/60 first:border-t-0 text-sm">
            <div className="min-w-0">
              <p className="text-[#f0f4ff] truncate">{i.nombre ?? i.objetivo}{i.proyecto && <span className="text-silver"> · {i.proyecto.nombre}</span>}</p>
              <p className="text-xs text-silver/60"><span className="font-mono">{i.codigo}</span> · {f.format(new Date(i.created_at))}</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-blue-accent">{estadoLabel(i.estado)}</p>
              {i.reunion && <p className="text-yellow-400">Reunión: {estadoLabel(i.reunion.estado)}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
