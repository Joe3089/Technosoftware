// PayPal Checkout (Orders v2) over REST — server only.
// Env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_ENV ("sandbox" | "live").

export const RECARGA = { min: 5, max: 2000, moneda: "USD" } as const;

// Values pasted into the Vercel dashboard often carry quotes or stray whitespace.
const env = (k: string) => process.env[k]?.trim().replace(/^["']|["']$/g, "").trim() || undefined;

const base = () =>
  env("PAYPAL_API_BASE") ??
  (env("PAYPAL_ENV")?.toLowerCase() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export const paypalConfigurado = () => !!(env("PAYPAL_CLIENT_ID") && env("PAYPAL_CLIENT_SECRET"));

async function token(): Promise<string> {
  const auth = Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64");
  const r = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`PayPal auth ${r.status} (${base()})`);
  return (await r.json()).access_token;
}

async function call<T = Record<string, any>>(path: string, init: RequestInit & { requestId?: string } = {}): Promise<{ status: number; body: T }> {
  const r = await fetch(`${base()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
  });
  return { status: r.status, body: await r.json().catch(() => ({}) as T) };
}

export interface Captura { estado: "COMPLETED" | "PENDING" | "DECLINED" | "FAILED" | string; captureId?: string; monto?: number; moneda?: string }

/** Extracts the (single) capture of an order response. */
export function capturaDe(order: any): Captura | null {
  const c = order?.purchase_units?.[0]?.payments?.captures?.[0];
  if (!c) return null;
  return { estado: c.status, captureId: c.id, monto: Number(c.amount?.value), moneda: c.amount?.currency_code };
}

export function crearOrden(recargaId: string, monto: number, returnUrl: string, cancelUrl: string) {
  return call("/v2/checkout/orders", {
    method: "POST",
    requestId: `crear-${recargaId}`,          // idempotent create
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: recargaId,
        custom_id: recargaId,
        description: "Recarga de saldo Technosoftware",
        amount: { currency_code: RECARGA.moneda, value: monto.toFixed(2) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Technosoftware", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING",
            return_url: returnUrl, cancel_url: cancelUrl,
          },
        },
      },
    }),
  });
}

export const obtenerOrden = (orderId: string) => call(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);

export const capturarOrden = (orderId: string, recargaId: string) =>
  call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", requestId: `capturar-${recargaId}` });

/** Verifies a webhook with PayPal's verify-webhook-signature API. */
export async function verificarWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  if (!webhookId) return false;
  const h = (k: string) => headers.get(k) ?? "";
  const { status, body } = await call("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: h("paypal-auth-algo"), cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"), transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"), webhook_id: webhookId, webhook_event: event,
    }),
  });
  return status === 200 && body.verification_status === "SUCCESS";
}
