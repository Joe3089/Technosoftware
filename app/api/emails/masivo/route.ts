import { Resend } from "resend";
import { requireRole, json, str } from "@/lib/api";

const SEGMENTOS = ["interesados", "fijos", "todos"] as const;
type Segmento = (typeof SEGMENTOS)[number];
const BATCH = 100; // límite de Resend por llamada batch

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

function plantilla(mensaje: string, nombre: string) {
  const cuerpo = escapeHtml(mensaje.replaceAll("{{nombre}}", nombre)).replace(/\n/g, "<br/>");
  return `<!doctype html><html><body style="margin:0;background:#080e1a;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0e1628;border:1px solid #1e3573;border-radius:16px">
  <tr><td style="padding:28px 32px;border-bottom:1px solid #1e3573;color:#f0f4ff;font-size:22px;font-weight:700;letter-spacing:2px">TECHNOSOFTWARE</td></tr>
  <tr><td style="padding:32px;color:#c9d6f0;font-size:15px;line-height:1.6">${cuerpo}</td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #1e3573;color:#9aafd4;font-size:12px">Recibes este correo porque eres cliente o mostraste interés en Technosoftware.</td></tr>
  </table></td></tr></table></body></html>`;
}

// POST /api/emails/masivo — solo admin
// body: { asunto, mensaje, segmento: "interesados"|"fijos"|"todos", prueba?: true }
// En el mensaje, {{nombre}} se reemplaza por el nombre de cada cliente.
export async function POST(req: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth.session;

  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from)
    return json({ error: "Faltan RESEND_API_KEY o EMAIL_FROM en las variables de entorno" }, 500);

  const body = await req.json().catch(() => ({}));
  const asunto = str(body.asunto, 200);
  const mensaje = str(body.mensaje, 20000);
  const segmento = body.segmento as Segmento;
  if (!asunto || !mensaje || !SEGMENTOS.includes(segmento))
    return json({ error: "asunto, mensaje y segmento (interesados | fijos | todos) son obligatorios" }, 400);

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Modo prueba: solo al administrador que envía
  if (body.prueba) {
    const { error } = await resend.emails.send({
      from, to: user.email!, subject: `[PRUEBA] ${asunto}`, html: plantilla(mensaje, "Administrador"),
    });
    return error ? json({ error: error.message }, 502) : json({ ok: true, enviados: 1, prueba: true });
  }

  let query = supabase.from("clientes").select("nombre, email").eq("suscrito", true);
  if (segmento !== "todos") query = query.eq("tipo", segmento === "fijos" ? "fijo" : "interesado");
  const { data: clientes, error: dbError } = await query;
  if (dbError) return json({ error: dbError.message }, 500);
  if (!clientes?.length) return json({ error: "No hay clientes en ese segmento" }, 400);

  let enviados = 0, fallidos = 0;
  for (let i = 0; i < clientes.length; i += BATCH) {
    const lote = clientes.slice(i, i + BATCH).map((c) => ({
      from, to: c.email, subject: asunto, html: plantilla(mensaje, c.nombre),
    }));
    const { error } = await resend.batch.send(lote);
    if (error) fallidos += lote.length; else enviados += lote.length;
  }

  await supabase.from("campanas_email").insert({ asunto, segmento, enviados, fallidos, creado_por: user.id });
  return json({ ok: fallidos === 0, enviados, fallidos, total: clientes.length });
}

// GET /api/emails/masivo — historial de campañas (solo admin)
export async function GET() {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.session.supabase
    .from("campanas_email").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return json({ error: error.message }, 500);
  return json({ campanas: data });
}
