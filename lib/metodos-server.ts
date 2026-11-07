import { paypalConfigurado } from "@/lib/paypal";
import { datosCompletos, type Metodo } from "@/lib/pagos";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Methods with a computed `disponible` flag: active + configured (PayPal: server credentials; manual: receiving data). */
export async function listarMetodos(supabase: SupabaseClient): Promise<Metodo[]> {
  const { data, error } = await supabase.from("metodos_pago").select("*").order("orden");
  if (error) throw error;
  return (data as Metodo[]).map((m) => ({
    ...m,
    disponible: m.activo && (m.tipo === "automatico" ? m.id === "paypal" && paypalConfigurado() : datosCompletos(m)),
  }));
}
