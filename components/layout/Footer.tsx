"use client";

import Image from "next/image";
import Link from "next/link";

const LINKS_NAV = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/mision", label: "Misión" },
  { href: "/vision", label: "Visión" },
  { href: "/#proyectos", label: "Proyectos" },
  { href: "/#contacto", label: "Contacto" },
];

const LINKS_SERVICES = [
  "Desarrollo Web",
  "Apps Móviles",
  "Cloud & DevOps",
  "Inteligencia Artificial",
  "Analytics",
  "Soporte Técnico",
];

const LINKS_LEGAL = [
  "Política de Privacidad",
  "Términos de Uso",
  "Cookies",
];

const SOCIAL: { label: string; color: string; path: string; href?: string }[] = [
  {
    label: "LinkedIn", color: "#0a66c2",
    path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
  {
    label: "Facebook", color: "#1877f2", href: "https://www.facebook.com/profile.php?id=100063471650442",
    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  {
    label: "Instagram", color: "#e1306c", href: "https://www.instagram.com/technosoftware07",
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z",
  },
  {
    label: "Threads", color: "#ffffff", href: "https://www.threads.com/@technosoftware07",
    path: "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z",
  },
  {
    label: "YouTube", color: "#ff0000",
    path: "M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
  },
  {
    label: "WhatsApp", color: "#25d366", href: "https://wa.me/351935936749",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.017.528 3.908 1.442 5.546L0 24l6.62-1.406A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.884 0-3.653-.492-5.189-1.348l-.372-.22-3.853.819.843-3.762-.243-.389A10 10 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z",
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-glass-bd bg-navy-deep/90 pt-16 pb-8 overflow-hidden">
      {/* Glow background */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(ellipse, rgba(77,127,255,0.3) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 mb-12">
          {/* Brand col */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-3 h-10 -mt-3 overflow-visible">
              <Image
                src="/logo.png"
                alt="Technosoftware"
                width={160}
                height={160}
                className="animate-spin-3d-slow drop-shadow-[0_0_8px_rgba(77,127,255,0.5)] max-w-none"
              />
            </Link>
            <p className="mt-5 text-sm text-silver leading-relaxed">
              Código que Hace la Diferencia.
              <br />
              Soluciones que Perduran.
            </p>
            {/* Status indicator */}
            <div className="inline-flex items-center gap-2 text-xs font-ui text-status-green">
              <span className="w-2 h-2 rounded-full bg-status-green animate-pulse-glow" />
              Sistemas operativos
            </div>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-xs font-ui font-semibold uppercase tracking-widest text-silver mb-4">
              Navegación
            </h4>
            <ul className="flex flex-col gap-2">
              {LINKS_NAV.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-silver hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-ui font-semibold uppercase tracking-widest text-silver mb-4">
              Servicios
            </h4>
            <ul className="flex flex-col gap-2">
              {LINKS_SERVICES.map((s) => (
                <li key={s}>
                  <span className="text-sm text-silver hover:text-white transition-colors cursor-default">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-ui font-semibold uppercase tracking-widest text-silver mb-4">
              Legal
            </h4>
            <ul className="flex flex-col gap-2">
              {LINKS_LEGAL.map((l) => (
                <li key={l}>
                  <span className="text-sm text-silver hover:text-white transition-colors cursor-pointer">
                    {l}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Social + contact */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-ui font-semibold uppercase tracking-widest text-silver mb-4">
              Redes Sociales
            </h4>
            <div className="flex flex-wrap gap-3">
              {SOCIAL.filter((s) => s.href).map(({ label, color, path, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="p-2 rounded-lg border border-glass-bd text-silver transition-all duration-300 hover:-translate-y-1"
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = color)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "")
                  }
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={path} fillRule="evenodd" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-glass-bd pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-silver">
          <span>
            © {new Date().getFullYear()} Technosoftware. Todos los derechos reservados.
          </span>
          <span className="font-mono text-xs text-silver/40">
            v2.0.0 · Next.js · Tailwind · Shadcn/UI
          </span>
        </div>
      </div>
    </footer>
  );
}
