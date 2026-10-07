"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Download, ChevronDown } from "lucide-react";
import { useNavbarScroll } from "@/hooks/useNavbarScroll";
import { cn } from "@/lib/utils";

const ABOUT_LINKS = [
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/mision", label: "Misión" },
  { href: "/vision", label: "Visión" },
];

const NAV_LINKS: { href: string; label: string; id: string; children?: typeof ABOUT_LINKS }[] = [
  { href: "/#inicio", label: "Inicio", id: "inicio" },
  { href: "/quienes-somos", label: "Quiénes Somos", id: "quienes-somos", children: ABOUT_LINKS },
  { href: "/#proyectos", label: "Proyectos", id: "proyectos" },
  { href: "/#contacto", label: "Contacto", id: "contacto" },
];

export default function Navbar() {
  const { scrolled, activeSection } = useNavbarScroll();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const isActive = (link: (typeof NAV_LINKS)[number]) =>
    link.children
      ? link.children.some((c) => c.href === pathname) || (pathname === "/" && activeSection === link.id)
      : pathname === "/" && activeSection === link.id;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled || pathname !== "/"
          ? "glass-heavy shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      )}
      style={{ height: "72px" }}
    >
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-[110px] h-[110px] sm:w-[160px] sm:h-[160px]">
            <Image
              src="/logo.png"
              alt="Technosoftware"
              fill
              sizes="160px"
              className="object-contain drop-shadow-[0_0_8px_rgba(77,127,255,0.6)]"
            />
          </div>
        </Link>

        {/* Desktop links — absolutely centered */}
        <ul className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => (
            <li key={link.id} className="relative group">
              <Link
                href={link.href}
                className={cn(
                  "relative inline-flex items-center gap-1 px-4 py-2 text-sm font-ui font-semibold uppercase tracking-wider transition-colors duration-300",
                  isActive(link) ? "text-[#f0f4ff]" : "text-silver hover:text-[#f0f4ff]"
                )}
              >
                {link.label}
                {link.children && <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />}
                {isActive(link) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-blue-accent to-cyan rounded-full" />
                )}
              </Link>
              {link.children && (
                <div className="invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 absolute left-1/2 -translate-x-1/2 top-full pt-2">
                  <ul className="glass-heavy rounded-xl border border-glass-bd p-2 min-w-[200px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    {link.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className={cn(
                            "block px-4 py-2 rounded-lg text-sm font-ui font-semibold uppercase tracking-wider transition-colors",
                            pathname === c.href ? "text-white bg-blue-accent/10" : "text-silver hover:text-white hover:bg-white/5"
                          )}
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Login button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-ui font-semibold text-white transition-all duration-300 bg-gradient-cta hover:shadow-glow hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Descarga nuestra app</span>
          </Link>
          <Link href="/login" aria-label="Descarga nuestra app" className="sm:hidden p-2 text-silver hover:text-white transition-colors">
            <Download className="w-5 h-5" />
          </Link>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-silver hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden glass-heavy border-t border-glass-bd max-h-[calc(100vh-72px)] overflow-y-auto">
          <ul className="px-4 sm:px-6 py-4 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                {link.children ? (
                  <>
                    <button
                      onClick={() => setAboutOpen(!aboutOpen)}
                      aria-expanded={aboutOpen}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-ui font-semibold uppercase tracking-wider transition-colors",
                        isActive(link)
                          ? "text-white bg-blue-accent/10 border border-blue-accent/30"
                          : "text-silver hover:text-white hover:bg-white/5"
                      )}
                    >
                      {link.label}
                      <ChevronDown className={cn("w-4 h-4 transition-transform", aboutOpen && "rotate-180")} />
                    </button>
                    {aboutOpen && (
                      <ul className="mt-1 ml-4 flex flex-col gap-1 border-l border-glass-bd pl-3">
                        {link.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                "block px-4 py-2 rounded-lg text-sm font-ui font-semibold uppercase tracking-wider transition-colors",
                                pathname === c.href ? "text-white bg-blue-accent/10" : "text-silver hover:text-white hover:bg-white/5"
                              )}
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm font-ui font-semibold uppercase tracking-wider transition-colors",
                      isActive(link)
                        ? "text-white bg-blue-accent/10 border border-blue-accent/30"
                        : "text-silver hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
