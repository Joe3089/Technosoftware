"use client";

import { useGestion, useLista } from "@/components/management/contexto";
import { fmtFechaHora } from "@/components/management/ui";

type Evento = { id: number; accion: string; entidad: string; cambios: Record<string, unknown> | null; created_at: string; actor_id: string | null };
const ACCION: Record<string, string> = { crear: "Creó", actualizar: "Modificó", eliminar: "Eliminó" };
const valor = (v: unknown) => (v == null ? "vacío" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Historial desde la auditoría (requiere permiso auditoria.ver). */
export function Historial({ entidad, entidadId }: { entidad: string; entidadId: string }) {
  const { puede } = useGestion();
  const { datos, cargando } = useLista<Evento>(puede("auditoria.ver") ? "auditoria" : null, { "f.entidad": entidad, "f.entidad_id": entidadId, size: 50 });
  if (!puede("auditoria.ver")) return <p className="text-xs text-silver/60">El historial detallado requiere el permiso de auditoría.</p>;
  if (cargando) return <p className="text-xs text-silver/60">Cargando…</p>;
  if (!datos.length) return <p className="text-xs text-silver/60">Sin eventos registrados.</p>;
  return (
    <ol className="space-y-2 text-xs">
      {datos.map((e) => (
        <li key={e.id} className="border-l-2 border-blue-accent/40 pl-3">
          <p className="text-silver"><span className="text-[#f0f4ff]">{ACCION[e.accion] ?? e.accion}</span> · {fmtFechaHora(e.created_at)}</p>
          {e.cambios && (
            <ul className="text-silver/80 mt-0.5">
              {Object.entries(e.cambios).map(([k, v]) => (
                <li key={k}><span className="text-silver">{k}</span>: {v && typeof v === "object" && "de" in (v as object)
                  ? `${valor((v as { de: unknown }).de)} → ${valor((v as { a: unknown }).a)}` : valor(v)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
