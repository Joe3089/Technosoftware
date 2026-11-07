// Reconciliation of APPROVED top-ups (server only). The AI never verifies or approves payments:
// administration approves; afterwards this module checks that the approval is reflected correctly
// in the wallet ledger and the AI writes the reconciliation note.
import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/server";
import { registrarActividad } from "@/lib/actividad";
import { calcularBilletera } from "@/lib/billetera";
import { obtenerTasas } from "@/lib/tasas";
import { modeloAsistente } from "@/lib/asistente-modelo";

export interface Control { id: string; ok: boolean | null; detalle: string }
export interface Conciliacion {
  estado: "conciliado" | "con_diferencias";
  controles: Control[]; nota: string; tasa_bcv: number | null; saldo_disponible: number | null; at: string;
}

const usd = (n: number) => `${n.toFixed(2)} USD`;

export async function conciliarRecarga(id: string): Promise<Conciliacion | null> {
  const db = createAdminClient();
  const { data: rec } = await db.from("recargas")
    .select("id, user_id, monto, moneda, estado, metodo, referencia, fecha_pago, monto_origen, moneda_origen, movimiento_id, revisado_por, metodo_info:metodos_pago(nombre)")
    .eq("id", id).maybeSingle();
  if (!rec || rec.estado !== "aprobado") return null;
  const metodo = (rec.metodo_info as unknown as { nombre: string } | null)?.nombre ?? rec.metodo;
  const monto = Number(rec.monto);
  const controles: Control[] = [];

  // 1) The credit exists in the ledger, for the right client and amount
  const { data: mov } = rec.movimiento_id
    ? await db.from("movimientos").select("id, user_id, tipo, monto, created_at").eq("id", rec.movimiento_id).maybeSingle()
    : { data: null };
  controles.push({ id: "abono", ok: !!mov && mov.tipo === "abono", detalle: mov ? `Abono registrado en la billetera el ${new Date(mov.created_at).toLocaleString("es")}` : "No hay abono en la billetera para este pago aprobado" });
  if (mov) {
    controles.push({ id: "monto", ok: Math.abs(Number(mov.monto) - monto) < 0.005, detalle: `Acreditado ${usd(Number(mov.monto))} · aprobado ${usd(monto)}` });
    controles.push({ id: "cliente", ok: mov.user_id === rec.user_id, detalle: mov.user_id === rec.user_id ? "Acreditado al cliente que reportó el pago" : "El abono pertenece a otro usuario" });
  }

  // 2) Not credited twice under the same reference
  if (rec.referencia) {
    const { count } = await db.from("recargas").select("id", { count: "exact", head: true })
      .eq("estado", "aprobado").eq("metodo", rec.metodo).ilike("referencia", rec.referencia).neq("id", rec.id);
    controles.push({ id: "unico", ok: !count, detalle: count ? "Otra recarga aprobada usa la misma referencia" : "Referencia acreditada una sola vez" });
  }

  // 3) Bolívares: exchange difference against today's BCV rate (informative)
  let tasa: number | null = null;
  if (rec.moneda_origen === "VES" && rec.monto_origen) {
    tasa = (await obtenerTasas().catch(() => ({ tasas: [] }))).tasas.find((t) => t.id === "usd_bcv")?.valor ?? null;
    if (tasa) {
      const equivalente = Number(rec.monto_origen) / tasa, dif = equivalente - monto;
      controles.push({ id: "tasa_bcv", ok: Math.abs(dif) / monto <= 0.05,
        detalle: `Bs. ${Number(rec.monto_origen).toFixed(2)} a tasa BCV ${tasa.toFixed(2)} = ${usd(equivalente)} (${dif >= 0 ? "+" : ""}${dif.toFixed(2)} USD frente a lo acreditado)` });
    }
  }

  // 4) Current wallet balance of the client (informative)
  const [movs, proys] = await Promise.all([
    db.from("movimientos").select("id, proyecto_id, tipo, monto, metodo, referencia, descripcion, created_at").eq("user_id", rec.user_id),
    db.from("proyectos").select("id, nombre, estado").eq("user_id", rec.user_id),
  ]);
  const saldo = movs.data ? calcularBilletera(movs.data, proys.data ?? []).disponible : null;
  if (saldo != null) controles.push({ id: "saldo", ok: null, detalle: `Saldo disponible del cliente tras la conciliación: ${usd(saldo)}` });

  const estado: Conciliacion["estado"] = controles.some((c) => c.ok === false) ? "con_diferencias" : "conciliado";

  // 5) Reconciliation note written by the AI (deterministic text if no model answers)
  let nota = estado === "conciliado"
    ? `Pago de ${usd(monto)} por ${metodo} (ref. ${rec.referencia ?? "—"}) conciliado: el abono coincide con lo aprobado.`
    : `Pago de ${usd(monto)} por ${metodo} con diferencias: ${controles.filter((c) => c.ok === false).map((c) => c.detalle).join("; ")}.`;
  const modelo = modeloAsistente();
  if (modelo) {
    try {
      const { text } = await generateText({
        model: modelo, temperature: 0.2, maxRetries: 0, abortSignal: AbortSignal.timeout(20_000),
        system: "Eres el asistente contable de Technosoftware. Redacta una nota de conciliación bancaria en español, de 2 a 3 frases, objetiva, sin inventar datos ni cifras que no estén en los controles. Indica si quedó conciliado y, si hay diferencias, qué debe revisar administración.",
        prompt: JSON.stringify({ metodo, referencia: rec.referencia, fecha_pago: rec.fecha_pago, monto_usd: monto, monto_origen: rec.monto_origen, moneda_origen: rec.moneda_origen, estado, controles }),
      });
      if (text.trim()) nota = text.trim().slice(0, 600);
    } catch (e) { console.error("[conciliacion] IA:", (e as Error).message.slice(0, 120)); }
  }

  const c: Conciliacion = { estado, controles, nota, tasa_bcv: tasa, saldo_disponible: saldo, at: new Date().toISOString() };
  await db.from("recargas").update({ conciliacion: c, conciliado_at: c.at }).eq("id", rec.id);
  if (estado === "conciliado") {
    await registrarActividad({ userId: rec.user_id, accion: "recarga_conciliada", entidad: "recarga", entidadId: rec.id,
      descripcion: `Tu pago de ${usd(monto)} por ${metodo} fue conciliado y está disponible en tu saldo` });
  }
  return c;
}
