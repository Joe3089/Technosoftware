import { createHash } from "node:crypto";
import { generateText } from "ai";
import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { permitido } from "@/lib/asistente";
import { modeloAsistente } from "@/lib/asistente-modelo";
import { VARIANTE, esIdioma } from "@/lib/idiomas";

export const maxDuration = 60;

const MAX_TEXTOS = 80;
const MAX_LARGO = 1200;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Translates a batch with the free-first AI chain; returns null if no model answered usable JSON. */
async function traducirIA(textos: string[], idioma: keyof typeof VARIANTE): Promise<string[] | null> {
  const model = modeloAsistente();
  if (!model) return null;
  const { text } = await generateText({
    model, temperature: 0,
    system: `You translate UI text of "Technosoftware", a software development and IT support agency website and app, from Spanish into ${VARIANTE[idioma]}
Rules: return ONLY a JSON array of strings with exactly the same length and order as the input. Keep brand names (Technosoftware, Techno, BCV, Binance, PayPal, Zelle, AirTM, Pago Móvil, Mercantil, WhatsApp, ERP), numbers, currency amounts, codes, emails, URLs, emojis and symbols (→ « » • ·) unchanged. Preserve capitalization style (ALL CAPS stays ALL CAPS) and leading/trailing punctuation. Short labels stay short.`,
    prompt: JSON.stringify(textos),
  });
  const ini = text.indexOf("["), fin = text.lastIndexOf("]");
  try {
    const arr = JSON.parse(text.slice(ini, fin + 1));
    if (Array.isArray(arr) && arr.length === textos.length && arr.every((x) => typeof x === "string")) return arr;
  } catch { /* falls through */ }
  return null;
}

/** Free public fallback (MyMemory, ~5k chars/day per server IP). */
async function traducirMyMemory(t: string, idioma: string) {
  const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=es|${idioma}`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  const out = j?.responseData?.translatedText;
  return typeof out === "string" && j?.responseStatus === 200 && !/MYMEMORY WARNING/i.test(out) ? out : null;
}

// GET /api/traducir?idioma=it — the whole AI-translated dictionary of a language in one response,
// so switching language applies instantly instead of translating text by text.
export async function GET(req: Request) {
  const idioma = new URL(req.url).searchParams.get("idioma");
  if (!esIdioma(idioma) || idioma === "es") return json({ error: "Idioma inválido" }, 400);
  const db = createAdminClient();
  const dicc: Record<string, string> = {};
  for (let desde = 0; ; desde += 1000) {  // PostgREST returns at most 1000 rows per request
    const { data, error } = await db.from("traducciones").select("original, traduccion")
      .eq("idioma", idioma).eq("fuente", "ia").order("hash").range(desde, desde + 999);
    if (error) return json({ error: "No se pudo cargar el diccionario" }, 500);
    for (const r of data) dicc[r.original] = r.traduccion;
    if (data.length < 1000 || desde >= 20000) break;
  }
  return new Response(JSON.stringify({ traducciones: dicc }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}

// POST /api/traducir { idioma, textos: string[] } → { traducciones: { [original]: traducción } }
// Público: los textos son de la interfaz. Cada texto se traduce una sola vez por idioma (caché en BD).
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!permitido(`tr:${ip}`, 120)) return json({ error: "Demasiadas solicitudes" }, 429);

  const b = await req.json().catch(() => null);
  if (!esIdioma(b?.idioma) || b.idioma === "es") return json({ error: "Idioma inválido" }, 400);
  const idioma = b.idioma as keyof typeof VARIANTE;
  const textos: string[] = Array.isArray(b?.textos)
    ? [...new Set<string>(b.textos.filter((t: unknown) => typeof t === "string" && t.trim() && t.length <= MAX_LARGO))].slice(0, MAX_TEXTOS)
    : [];
  if (!textos.length) return json({ traducciones: {} });

  const db = createAdminClient();
  const porHash = new Map(textos.map((t) => [hash(t), t]));
  const { data: guardadas } = await db.from("traducciones").select("hash, traduccion, fuente").eq("idioma", idioma).in("hash", [...porHash.keys()]);
  // With AI keys configured, provisional (MyMemory) rows get re-translated and replaced
  const hayIA = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GROQ_API_KEY || process.env.AI_GATEWAY_API_KEY);
  const traducciones: Record<string, string> = {};
  const provisionales: string[] = [];
  for (const g of guardadas ?? []) {
    if (g.fuente !== "ia" && hayIA) continue;
    traducciones[porHash.get(g.hash)!] = g.traduccion;
    if (g.fuente !== "ia") provisionales.push(porHash.get(g.hash)!);
  }

  const faltan = textos.filter((t) => !(t in traducciones));
  if (faltan.length) {
    let nuevas = await traducirIA(faltan, idioma).catch((e) => { console.error("[traducir] IA:", e?.message?.slice(0, 200)); return null; });
    const fuente = nuevas ? "ia" : "mymemory";
    if (!nuevas) {
      // Without AI keys (or limits reached): translate a few strings per request with the public fallback
      nuevas = await Promise.all(faltan.map((t, i) => (i < 15 ? traducirMyMemory(t, idioma).catch(() => null) : null))) as string[];
    }
    const filas = faltan.flatMap((t, i) => (nuevas![i] ? [{ idioma, hash: hash(t), original: t, traduccion: nuevas![i], fuente }] : []));
    for (const f of filas) { traducciones[f.original] = f.traduccion; if (fuente !== "ia") provisionales.push(f.original); }
    if (filas.length) {
      // AI results replace provisional ones; provisional ones never overwrite anything
      const { error } = await db.from("traducciones").upsert(filas, { onConflict: "idioma,hash", ignoreDuplicates: fuente !== "ia" });
      if (error) console.error("[traducir] caché:", error.message);
    }
  }
  return json({ traducciones, provisionales });
}
