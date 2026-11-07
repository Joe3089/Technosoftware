// Payment gateway catalog shared by client and server.
// Receiving-account data is entered by the admin (never hard-coded).

export type MetodoId = "paypal" | "zelle" | "binance" | "airtm" | "pago_movil" | "mercantil_pa";

export interface Metodo {
  id: MetodoId;
  nombre: string;
  tipo: "automatico" | "manual";
  moneda: string;
  activo: boolean;
  datos: Record<string, string>;
  instrucciones: string | null;
  orden: number;
  disponible?: boolean;
}

/** Receiving-account fields per manual method: [key, label, required]. */
export const CAMPOS_METODO: Record<MetodoId, [string, string, boolean][]> = {
  paypal: [],
  zelle: [["titular", "Titular", true], ["contacto", "Correo o teléfono Zelle", true]],
  binance: [["pay_id", "Binance Pay ID", true], ["titular", "Usuario / titular", false]],
  airtm: [["email", "Correo AirTM", true], ["titular", "Titular", false]],
  pago_movil: [["banco", "Banco", true], ["telefono", "Teléfono", true], ["documento", "RIF / C.I.", true], ["titular", "Titular", false]],
  mercantil_pa: [["titular", "Titular", true], ["tipo_cuenta", "Tipo de cuenta", true], ["numero_cuenta", "Número de cuenta", true], ["documento", "RUC / Cédula", false]],
};

/** Brand tile styling (logos in /public/pagos when an official SVG is available). */
export const MARCA: Record<MetodoId, { bg: string; logo?: string; texto?: string; color?: string }> = {
  paypal: { bg: "#003087", logo: "/pagos/paypal.svg" },
  zelle: { bg: "#6D1ED4", logo: "/pagos/zelle.svg" },
  binance: { bg: "#F0B90B", logo: "/pagos/binance.svg" },
  airtm: { bg: "#ffffff", texto: "airtm", color: "#0a2540" },
  pago_movil: { bg: "#0e7a3e", texto: "Pago Móvil", color: "#ffffff" },
  mercantil_pa: { bg: "#004b8d", texto: "Mercantil", color: "#ffffff" },
};

export const datosCompletos = (m: Pick<Metodo, "id" | "datos">) =>
  (CAMPOS_METODO[m.id] ?? []).every(([k, , req]) => !req || !!m.datos?.[k]?.trim());

/** Any visible text (letters with accents, upper/lowercase, symbols); only control chars and <> are rejected. */
export const REFERENCIA = /^[^\p{C}<>]{4,60}$/u;
