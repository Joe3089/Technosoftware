import { requireRole, json, str } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { RECARGA, crearOrden } from "@/lib/paypal";
import { REFERENCIA } from "@/lib/pagos";
import { listarMetodos } from "@/lib/metodos-server";
import { MAX_ARCHIVO, sniff } from "@/lib/archivos";
import { registrarActividad } from "@/lib/actividad";

// GET /api/recargas — últimas recargas del usuario + métodos disponibles
export async function GET() {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;
  const [{ data, error }, metodos] = await Promise.all([
    supabase.from("recargas")
      .select("id, monto, moneda, estado, detalle, metodo, referencia, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    listarMetodos(supabase).catch(() => []),
  ]);
  if (error) return json({ error: error.message }, 500);
  const disponibles = metodos.filter((m) => m.disponible);
  return json({ recargas: data, limites: RECARGA, metodos: disponibles, disponible: disponibles.length > 0 });
}

function validarMonto(raw: unknown) {
  const monto = Number(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(String(raw ?? "")) || !Number.isFinite(monto)) return { error: "Importe inválido (máximo 2 decimales)" };
  if (monto < RECARGA.min || monto > RECARGA.max) return { error: `El importe debe estar entre ${RECARGA.min} y ${RECARGA.max} ${RECARGA.moneda}` };
  return { monto };
}

// POST /api/recargas
//  · PayPal (JSON { metodo: "paypal", monto }): crea la orden y devuelve la URL de aprobación.
//  · Manual (multipart { metodo, monto, referencia, fecha_pago, monto_origen?, comprobante }):
//    queda "pendiente" hasta que el admin verifique el pago. El saldo NO cambia aquí en ningún caso.
export async function POST(req: Request) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth.session;

  const multipart = req.headers.get("content-type")?.includes("multipart/form-data");
  const form = multipart ? await req.formData().catch(() => null) : null;
  const body: Record<string, unknown> = form ? Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) : await req.json().catch(() => ({}));
  const metodoId = (body.metodo as string) || "paypal";

  const metodo = (await listarMetodos(supabase).catch(() => [])).find((m) => m.id === metodoId);
  if (!metodo?.disponible) return json({ error: "Ese método de pago no está disponible" }, 400);
  if (body.moneda && body.moneda !== RECARGA.moneda) return json({ error: "Moneda no admitida" }, 400);
  const v = validarMonto(body.monto);
  if ("error" in v) return json({ error: v.error }, 400);
  const { monto } = v;
  const admin = createAdminClient();

  // ── Manual methods: reported payment, verified by an admin ──
  if (metodo.tipo === "manual") {
    const referencia = str(body.referencia, 60);
    if (!referencia || !REFERENCIA.test(referencia)) return json({ error: "Referencia inválida (4 a 60 caracteres)" }, 400);
    const hoy = new Date().toISOString().slice(0, 10);
    const fecha = body.fecha_pago as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "") || fecha > hoy || fecha < new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
      return json({ error: "La fecha del pago debe estar dentro de los últimos 30 días" }, 400);
    let montoOrigen: number | null = null;
    if (metodo.moneda !== RECARGA.moneda) {
      montoOrigen = Number(body.monto_origen);
      if (!(montoOrigen > 0) || !/^\d+(\.\d{1,2})?$/.test(String(body.monto_origen)))
        return json({ error: `Indica el monto pagado en ${metodo.moneda}` }, 400);
    }

    let comprobante: { bytes: Uint8Array; mime: string; ext: string } | null = null;
    const file = form?.get("comprobante");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_ARCHIVO) return json({ error: "El comprobante debe pesar menos de 4 MB" }, 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const t = sniff(bytes, file.name);
      if (!t || !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(t.mime))
        return json({ error: "El comprobante debe ser una imagen (JPG, PNG, WebP) o PDF" }, 400);
      comprobante = { bytes, ...t };
    }
    if (!comprobante) return json({ error: "Adjunta la captura o el comprobante del pago" }, 400);

    const { data: rec, error } = await admin.from("recargas").insert({
      user_id: user.id, monto, moneda: RECARGA.moneda, metodo: metodo.id, proveedor: metodo.id, referencia,
      fecha_pago: fecha, monto_origen: montoOrigen, moneda_origen: metodo.moneda,
      detalle: "En verificación por nuestro equipo",
    }).select("id, monto, moneda, estado, detalle, metodo, referencia, created_at").single();
    if (error) {
      if (error.code === "23505") return json({ error: "Esa referencia ya fue reportada para este método" }, 409);
      return json({ error: "No se pudo registrar el pago. Intenta de nuevo." }, 500);
    }

    // The receipt is mandatory: if it can't be stored, the report is rolled back so the user can retry.
    const path = `${user.id}/recarga/${rec.id}.${comprobante.ext}`;
    const up = await admin.storage.from("adjuntos").upload(path, comprobante.bytes, { contentType: comprobante.mime });
    if (up.error) {
      await admin.from("recargas").delete().eq("id", rec.id);
      return json({ error: "No se pudo subir el comprobante. Intenta de nuevo." }, 500);
    }
    await admin.from("recargas").update({ comprobante_path: path }).eq("id", rec.id);

    await registrarActividad({
      userId: user.id, accion: "recarga_reportada", entidad: "recarga", entidadId: rec.id,
      descripcion: `Reportó un pago de ${monto.toFixed(2)} USD por ${metodo.nombre} (en verificación)`,
    });
    return json({ recarga: rec }, 201);
  }

  // ── PayPal ──
  const { data: rec, error } = await admin.from("recargas")
    .insert({ user_id: user.id, monto, moneda: RECARGA.moneda, metodo: "paypal" }).select().single();
  if (error) return json({ error: error.message }, 500);

  const origin = new URL(req.url).origin;
  const back = `${origin}/dashboard?recarga=${rec.id}`;
  try {
    const orden = await crearOrden(rec.id, monto, back, `${back}&cancelado=1`);
    const approve = orden.body.links?.find((l: { rel: string }) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (orden.status >= 300 || !orden.body.id || !approve) throw new Error(`PayPal orden ${orden.status}: ${JSON.stringify(orden.body).slice(0, 300)}`);
    await admin.from("recargas").update({ order_id: orden.body.id, updated_at: new Date().toISOString() }).eq("id", rec.id);
    await registrarActividad({
      userId: user.id, accion: "recarga_iniciada",
      descripcion: `Inició una recarga de ${monto.toFixed(2)} ${RECARGA.moneda} con PayPal`, entidad: "recarga", entidadId: rec.id,
    });
    return json({ id: rec.id, approveUrl: approve }, 201);
  } catch (e) {
    console.error("[recargas] PayPal:", e instanceof Error ? e.message : e);
    await admin.from("recargas").update({ estado: "error", detalle: "No se pudo crear el pago en PayPal" }).eq("id", rec.id);
    return json({ error: "No se pudo iniciar el pago con PayPal. Intenta de nuevo." }, 502);
  }
}
