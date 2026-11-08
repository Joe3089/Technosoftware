import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Content Security Policy. When adding an external service (script, image, API host), add it to the matching directive.
const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' only in development (React Refresh); production never evaluates strings as code
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} unpkg.com maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com`,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co unpkg.com *.tile.openstreetmap.org flagcdn.com maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com *.googleusercontent.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co nominatim.openstreetmap.org maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com",
  "worker-src 'self' blob:",
  "frame-src maps.google.com www.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Enlaces antiguos de la plataforma interna (/gestion) → /dashboard/<módulo>
  async redirects() {
    return [
      { source: "/gestion", destination: "/dashboard/inicio", permanent: false },
      { source: "/gestion/actividades", destination: "/dashboard/planificacion", permanent: false },
      { source: "/gestion/finanzas", destination: "/dashboard/contabilidad", permanent: false },
      { source: "/gestion/kpi", destination: "/dashboard/estadisticas", permanent: false },
      { source: "/gestion/:path*", destination: "/dashboard/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(self), microphone=(self), payment=(), usb=(), bluetooth=(), serial=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
      {
        // API responses carry personal data: never cache them in shared caches unless a route opts in
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
