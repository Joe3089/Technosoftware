import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' unpkg.com maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: unpkg.com *.tile.openstreetmap.org flagcdn.com maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com *.googleusercontent.com",
              "connect-src 'self' nominatim.openstreetmap.org maps.googleapis.com maps.gstatic.com *.googleapis.com *.gstatic.com *.google.com",
              "worker-src 'self' blob:",
              "frame-src maps.google.com www.google.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
