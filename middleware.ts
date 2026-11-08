import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLIC_KEY } from "@/lib/supabase/keys";

// Refreshes the Supabase session cookie and protects /dashboard and /gestion
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/** CSRF defense in depth (on top of SameSite cookies): state-changing API calls must come from this site. */
function origenAjeno(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || METODOS_SEGUROS.has(request.method)) return false;
  if (pathname.startsWith("/api/webhooks/")) return false; // server-to-server, verified by signature
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false; // non-browser clients don't send it; auth still applies
  try { return new URL(origin).host !== request.headers.get("host"); } catch { return true; }
}

export async function middleware(request: NextRequest) {
  if (origenAjeno(request)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });

  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && /^\/(dashboard|gestion)(\/|$)/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/gestion/:path*", "/login", "/api/:path*"],
};
