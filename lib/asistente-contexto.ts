// Private context for the assistant when the person chatting is signed in (server only).
// Read with the user's own session (RLS): it can only ever contain that user's data.
import { getSessionProfile } from "@/lib/supabase/server";
import { calcularBilletera } from "@/lib/billetera";

const ESTADO: Record<string, string> = {
  pendiente: "pendiente de verificación por administración",
  aprobado: "aprobado por administración",
  rechazado: "rechazado",
  cancelado: "cancelado",
  error: "con error en la pasarela",
  creado: "iniciado, sin completar el pago",
};

export async function contextoUsuario(): Promise<string | null> {
  const s = await getSessionProfile().catch(() => null);
  if (!s) return null;
  const [rec, movs, proys] = await Promise.all([
    s.supabase.from("recargas")
      .select("monto, estado, metodo, referencia, fecha_pago, monto_origen, moneda_origen, detalle, conciliacion, created_at, metodo_info:metodos_pago(nombre)")
      .eq("user_id", s.user.id).order("created_at", { ascending: false }).limit(6),
    s.supabase.from("movimientos").select("id, proyecto_id, tipo, monto, metodo, referencia, descripcion, created_at").eq("user_id", s.user.id),
    s.supabase.from("proyectos").select("id, nombre, estado").eq("user_id", s.user.id),
  ]);
  const saldo = movs.data ? calcularBilletera(movs.data, proys.data ?? []).disponible : null;

  const pagos = (rec.data ?? []).map((r) => {
    const metodo = (r.metodo_info as unknown as { nombre: string } | null)?.nombre ?? r.metodo;
    const conc = (r.conciliacion as { estado?: string } | null)?.estado;
    return `- ${new Date(r.created_at).toLocaleDateString("es")}: ${Number(r.monto).toFixed(2)} USD por ${metodo}`
      + (r.monto_origen ? ` (pagó ${Number(r.monto_origen).toFixed(2)} ${r.moneda_origen})` : "")
      + (r.referencia ? `, ref. ${r.referencia}` : "")
      + ` — ${ESTADO[r.estado] ?? r.estado}`
      + (r.estado === "aprobado" ? (conc === "conciliado" ? ", conciliado y disponible en su saldo" : conc ? ", en revisión contable" : ", en conciliación") : "")
      + (r.estado === "rechazado" && r.detalle ? ` (motivo: ${r.detalle})` : "");
  });

  return `# Cuenta del usuario que te escribe (datos privados: úsalos solo para orientarlo a él, nunca los muestres completos si no los pide)
- Nombre: ${s.fullName ?? "no indicado"} · rol: ${s.role === "admin" ? "administrador" : "cliente"}
- Saldo disponible en su billetera: ${saldo != null ? `${saldo.toFixed(2)} USD` : "no disponible"}
- Proyectos: ${(proys.data ?? []).map((p) => `${p.nombre} (${p.estado})`).join(", ") || "ninguno"}
- Últimos pagos/recargas:
${pagos.join("\n") || "- Ninguno registrado"}

Cómo orientarlo sobre sus pagos:
- Pendiente: administración debe verificar que el dinero llegó a la cuenta receptora; normalmente en horario laboral (lun–vie 9:00–17:00, hora de Venezuela). No puedes acelerar ni aprobar pagos.
- Aprobado y conciliado: ya está en su saldo (Perfil → Estado de Cuenta).
- Rechazado: explica el motivo y que puede volver a reportarlo con los datos correctos.
- Si pregunta por un pago que no aparece, guíalo a registrarlo: Métodos de Pago → elegir método → «Recargar saldo» → referencia, fecha, monto y captura del comprobante (obligatoria).
- Nunca confirmes que un pago llegó si no está aprobado.`;
}
