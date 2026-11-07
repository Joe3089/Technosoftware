import { createAdminClient } from "@/lib/supabase/server";

export interface Evento {
  userId: string;          // dueño del evento
  actorId?: string;        // quién lo ejecutó (por defecto, el mismo usuario)
  accion: string;
  descripcion: string;
  entidad?: string;
  entidadId?: string;
}

/** Registra un evento de auditoría desde el servidor. Nunca recibe datos sensibles. */
export async function registrarActividad(e: Evento) {
  const { error } = await createAdminClient().from("actividad").insert({
    user_id: e.userId,
    actor_id: e.actorId ?? e.userId,
    accion: e.accion,
    descripcion: e.descripcion.slice(0, 300),
    entidad: e.entidad ?? null,
    entidad_id: e.entidadId ?? null,
  });
  // La auditoría no debe tumbar la operación principal
  if (error) console.error("actividad:", error.message);
}
