// Free-first model chain for the assistant (server only).
// Order: Google Gemini (free tier) → Groq (free tier) → Vercel AI Gateway (needs a card on the Vercel team).
// Each provider is used only if its key is configured; when one fails (e.g. daily limit, 429) the next one answers.
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { gateway } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { MODELO, MODELO_RESPALDO } from "@/lib/asistente";

const env = (k: string) => process.env[k]?.trim().replace(/^["']|["']$/g, "") || undefined;

function cadena(): LanguageModelV3[] {
  const modelos: LanguageModelV3[] = [];
  const gemini = env("GOOGLE_GENERATIVE_AI_API_KEY");
  if (gemini) modelos.push(createGoogleGenerativeAI({ apiKey: gemini })(env("GEMINI_MODEL") ?? "gemini-flash-lite-latest"));
  const groq = env("GROQ_API_KEY");
  if (groq) modelos.push(createGroq({ apiKey: groq })(env("GROQ_MODEL") ?? "llama-3.3-70b-versatile"));
  // Gateway last: works on Vercel via OIDC once the team has a card on file
  if (env("VERCEL_OIDC_TOKEN") || env("AI_GATEWAY_API_KEY") || process.env.VERCEL) {
    modelos.push(gateway(MODELO) as LanguageModelV3, gateway(MODELO_RESPALDO) as LanguageModelV3);
  }
  return modelos;
}

/** A model that tries each configured provider in order until one accepts the request. */
export function modeloAsistente(): LanguageModelV3 | null {
  const modelos = cadena();
  if (!modelos.length) return null;
  async function probar<T>(fn: (m: LanguageModelV3) => PromiseLike<T>): Promise<T> {
    let ultimo: unknown;
    for (const m of modelos) {
      try { return await fn(m); }
      catch (e) {
        ultimo = e;
        console.error(`[asistente] ${m.provider}/${m.modelId} falló:`, e instanceof Error ? e.message.slice(0, 200) : e);
      }
    }
    throw ultimo;
  }
  return {
    specificationVersion: "v3",
    provider: "technosoftware-fallback",
    modelId: modelos.map((m) => m.modelId).join(" → "),
    supportedUrls: {},
    doGenerate: (o) => probar((m) => m.doGenerate(o)),
    doStream: (o) => probar((m) => m.doStream(o)),
  };
}
