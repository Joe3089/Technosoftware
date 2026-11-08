// Service worker de la gestión interna (/dashboard/<módulo>): permite abrirla sin conexión.
//  · Código y recursos estáticos (/_next/static, imágenes de marca): caché primero.
//  · Páginas de gestión y sus cargas RSC: red primero; sin red, la última copia guardada.
//  · No intercepta /api (los datos los gestiona la app con IndexedDB), el área de clientes ni el login.
const VERSION = "ts-gestion-v1";
const ESTATICOS = `${VERSION}-estaticos`;
const PAGINAS = `${VERSION}-paginas`;
const MODULO = /^\/dashboard\/[a-z]/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("ts-gestion") && !k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const OFFLINE = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión · Technosoftware</title><body style="background:#080e1a;color:#f0f4ff;font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">
<div><h1 style="font-size:1.2rem">Sin conexión</h1><p style="color:#9aafd4">Esta vista aún no se había abierto en este equipo.<br>Vuelve al <a style="color:#00cfff" href="/dashboard/inicio">tablero general</a>; los demás módulos funcionan sin internet.</p></div></body></html>`;

async function redPrimero(req, clave) {
  const cache = await caches.open(PAGINAS);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected && res.type === "basic") await cache.put(clave, res.clone());
    return res;
  } catch {
    const copia = await cache.match(clave);
    if (copia) return copia;
    throw new Error("sin copia");
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || /^\/(logo[\w-]*|icon|apple-icon)\.png$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(ESTATICOS);
      const copia = await cache.match(req);
      if (copia) return copia;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (!MODULO.test(url.pathname)) return;
  const esRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (esRsc) {
    // Navegación interna: si no hay red ni copia, Next.js recarga la página y la sirve el caso HTML
    const clave = `${url.pathname}?rsc`;
    e.respondWith(redPrimero(req, clave).catch(() => Response.error()));
    return;
  }
  if (req.mode === "navigate" || (req.headers.get("Accept") || "").includes("text/html")) {
    const clave = url.pathname + (url.search.replace(/[?&]_rsc=[^&]*/, "") || "");
    e.respondWith(redPrimero(req, url.pathname).catch(async () =>
      (await caches.match(clave, { cacheName: PAGINAS })) || new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
  }
});

self.addEventListener("message", async (e) => {
  if (e.data === "borrar-cache") for (const k of await caches.keys()) if (k.startsWith("ts-gestion")) await caches.delete(k);
});
