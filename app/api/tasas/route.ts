import { NextResponse } from "next/server";
import { obtenerTasas, type Tasa } from "@/lib/tasas";

// GET /api/tasas — público. BCV (USD, EUR) y Binance P2P (USDT) en bolívares.
// Cache en memoria de 60 s por instancia + CDN, para no saturar las fuentes.
let cache: { en: number; datos: { tasas: Tasa[]; actualizado: string } } | null = null;
const TTL = 60_000;

export async function GET() {
  if (!cache || Date.now() - cache.en > TTL) {
    const { tasas, errores } = await obtenerTasas();
    if (errores.length) console.error("[tasas]", errores.join(" | "));
    // Keep the last good values if every source failed this time
    if (tasas.length || !cache) cache = { en: Date.now(), datos: { tasas, actualizado: new Date().toISOString() } };
  }
  return NextResponse.json(cache.datos, {
    status: cache.datos.tasas.length ? 200 : 503,
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
