// Tiempo real: una sola suscripción a la auditoría (RLS: cada usuario solo recibe lo que puede ver)
// y a sus notificaciones. Cada evento refresca las vistas afectadas y la copia local de esa tabla.
import { createClient } from "@/lib/supabase/client";
import { actualizarTablas, emitir } from "./sync";

export function iniciarTiempoReal() {
  const sb = createClient();
  const pendientes = new Set<string>();
  let t: ReturnType<typeof setTimeout> | null = null;
  const programar = (tablas: (string | null)[]) => {
    for (const x of tablas) if (x) pendientes.add(x);
    emitir("gestion:cambio", { tablas: tablas.filter(Boolean), remoto: true });
    if (t) clearTimeout(t);
    t = setTimeout(() => { const l = [...pendientes]; pendientes.clear(); actualizarTablas(l); }, 3000);
  };
  const canal = sb.channel("gestion-interna")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "auditoria" }, (p) => {
      const n = p.new as { entidad?: string; padre?: string | null };
      programar([n.entidad ?? null, n.padre ?? null]);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, () => emitir("gestion:notificacion"))
    .subscribe((estado) => emitir("gestion:tiempo-real", estado));
  return () => { if (t) clearTimeout(t); sb.removeChannel(canal); };
}
