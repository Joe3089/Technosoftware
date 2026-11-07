import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { json } from "@/lib/api";
import { SISTEMA, permitido } from "@/lib/asistente";
import { modeloAsistente } from "@/lib/asistente-modelo";
import { contextoUsuario } from "@/lib/asistente-contexto";

export const maxDuration = 30;

const MAX_MENSAJES = 12;      // only the latest turns are sent to the model
const MAX_CARACTERES = 1500;  // per user message

// POST /api/asistente — chat público con el asistente de IA (web y app)
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!permitido(ip)) return json({ error: "Has enviado muchos mensajes seguidos. Intenta de nuevo en unos minutos." }, 429);

  const body = await req.json().catch(() => null);
  const messages: UIMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MENSAJES) : [];
  const ultimo = messages.at(-1);
  if (!ultimo || ultimo.role !== "user") return json({ error: "Mensaje inválido" }, 400);
  const largo = ultimo.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);
  if (!largo || largo > MAX_CARACTERES) return json({ error: `Escribe un mensaje de hasta ${MAX_CARACTERES} caracteres.` }, 400);

  // Only text parts from the client are trusted; anything else is dropped
  const limpios = messages.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type === "text") })) as UIMessage[];

  const model = modeloAsistente();
  if (!model) return json({ error: "El asistente aún no está configurado." }, 503);

  const result = streamText({
    model,
    // Signed-in users get answers about their own payments and balance
    system: [SISTEMA, await contextoUsuario()].filter(Boolean).join("\n\n"),
    messages: await convertToModelMessages(limpios),
    maxOutputTokens: 600,
    temperature: 0.4,
  });
  return result.toUIMessageStreamResponse({
    onError: (e) => {
      console.error("[asistente]", e instanceof Error ? e.message : e);
      return "El asistente no está disponible en este momento. Escríbenos por WhatsApp o desde el formulario de contacto.";
    },
  });
}
