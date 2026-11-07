// Exchange rates in VES (server only): BCV USD/EUR and Binance P2P USDT.
// Each rate has a primary source and a fallback, so one outage never empties the ticker.

import https from "node:https";
import { rootCertificates } from "node:tls";
import { SECTIGO_DV_R36 } from "@/lib/certs";

export interface Tasa { id: "usd_bcv" | "eur_bcv" | "usdt_binance"; valor: number; fecha: string | null; fuente: string }

const UA = { "User-Agent": "Mozilla/5.0 (compatible; TechnosoftwareTasas/1.0)" };
const numVE = (s: string) => Number(s.trim().replace(/\./g, "").replace(",", "."));

async function conTimeout(url: string, init: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" }); }
  finally { clearTimeout(t); }
}

/** GET with full TLS verification, adding the intermediate CA the BCV server omits. */
function htmlBcv(ms = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get("https://www.bcv.org.ve/", { headers: UA, ca: [...rootCertificates, SECTIGO_DV_R36], timeout: ms }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let html = ""; res.setEncoding("utf8");
      res.on("data", (c) => { html += c; }).on("end", () => resolve(html)).on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("timeout"))).on("error", reject);
  });
}

/** Official BCV page (rates published for the next value date). */
async function bcvOficial(): Promise<Tasa[]> {
  const html = (await htmlBcv()).replace(/\s+/g, " ");
  const leer = (id: string) => numVE(new RegExp(`id="${id}".{0,600}?<strong[^>]*>([^<]+)</strong>`).exec(html)?.[1] ?? "");
  const fecha = /property="dc:date"[^>]*content="([^"]+)"/.exec(html)?.[1] ?? null;
  const usd = leer("dolar"), eur = leer("euro");
  if (!(usd > 0) || !(eur > 0)) throw new Error("BCV: formato inesperado");
  return [
    { id: "usd_bcv", valor: usd, fecha, fuente: "bcv.org.ve" },
    { id: "eur_bcv", valor: eur, fecha, fuente: "bcv.org.ve" },
  ];
}

/** Public mirror of the BCV rates (fallback). */
async function bcvRespaldo(): Promise<Tasa[]> {
  const [d, e] = await Promise.all(["dolares", "euros"].map((x) =>
    conTimeout(`https://ve.dolarapi.com/v1/${x}/oficial`).then((r) => r.json())));
  if (!(d?.promedio > 0) || !(e?.promedio > 0)) throw new Error("dolarapi: sin datos");
  return [
    { id: "usd_bcv", valor: d.promedio, fecha: d.fechaActualizacion ?? null, fuente: "ve.dolarapi.com" },
    { id: "eur_bcv", valor: e.promedio, fecha: e.fechaActualizacion ?? null, fuente: "ve.dolarapi.com" },
  ];
}

/** Binance P2P USDT/VES: average of the best 10 buy offers. */
async function binance(): Promise<Tasa> {
  const r = await conTimeout("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
    method: "POST", headers: { ...UA, "Content-Type": "application/json" },
    body: JSON.stringify({ asset: "USDT", fiat: "VES", tradeType: "BUY", page: 1, rows: 10, payTypes: [], publisherType: null }),
  });
  const precios: number[] = ((await r.json())?.data ?? []).map((a: { adv?: { price?: string } }) => Number(a.adv?.price)).filter((n: number) => n > 0);
  if (precios.length < 3) throw new Error("Binance: pocas ofertas");
  const valor = precios.reduce((s, n) => s + n, 0) / precios.length;
  return { id: "usdt_binance", valor: Math.round(valor * 100) / 100, fecha: new Date().toISOString(), fuente: "Binance P2P" };
}

export async function obtenerTasas(): Promise<{ tasas: Tasa[]; errores: string[] }> {
  const errores: string[] = [];
  const [bcv, usdt] = await Promise.all([
    bcvOficial().catch((e) => { errores.push(`bcv: ${e.message}`); return bcvRespaldo(); }).catch((e) => { errores.push(`respaldo: ${e.message}`); return [] as Tasa[]; }),
    binance().catch((e) => { errores.push(`binance: ${e.message}`); return null; }),
  ]);
  return { tasas: [...bcv, ...(usdt ? [usdt] : [])], errores };
}
