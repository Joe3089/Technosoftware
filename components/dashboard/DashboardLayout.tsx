"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, User, FolderOpen, MessageSquare, CreditCard,
  LogOut, ChevronRight, Menu, Inbox, Landmark, Wallet, History, BarChart2,
  CheckSquare, Calendar, PlusCircle, Smartphone, DollarSign,
  FileText, BadgeDollarSign, Lock, ShieldCheck, Users, Mail, FileSignature, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import SelectorIdioma, { Reloj } from "@/components/i18n/SelectorIdioma";
import EnlaceGestion from "@/components/gestion/EnlaceGestion";
import { useAuth } from "@/hooks/useAuth";
import { useMetodosPago } from "@/hooks/useMetodosPago";
import type { Metodo } from "@/lib/pagos";
import { usePersonalData, isProfileComplete } from "@/hooks/usePersonalData";

export type PanelId =
  | "home"
  | "datos-personales" | "historial" | "estado-cuenta"
  | "historial-proyectos" | "estatus-proyectos" | "proyectos-culminados" | "contratacion" | "resenas"
  | "consultoria" | "nuevo-proyecto"
  | "pago-movil" | "zelle" | "airtm" | "binance" | "paypal" | "mercantil-pa"
  | "admin-clientes" | "admin-correos" | "admin-solicitudes" | "admin-pagos";

interface SubItem { id: PanelId; label: string; icon: React.ElementType }
interface Section { id: string; label: string; icon: React.ElementType; subs: SubItem[] }

const SECTIONS: Section[] = [
  {
    id: "perfil", label: "Perfil", icon: User,
    subs: [
      { id: "datos-personales",  label: "Datos Personales", icon: FileText },
      { id: "historial",         label: "Historial",        icon: History  },
      { id: "estado-cuenta",     label: "Estado de Cuenta", icon: BarChart2 },
    ],
  },
  {
    id: "proyectos", label: "Proyectos", icon: FolderOpen,
    subs: [
      { id: "historial-proyectos",   label: "Historial de Proyectos",  icon: History    },
      { id: "estatus-proyectos",     label: "Estatus de Proyectos",    icon: BarChart2  },
      { id: "proyectos-culminados",  label: "Proyectos Culminados",    icon: CheckSquare },
      { id: "contratacion",          label: "Presupuesto y Contrato",  icon: FileSignature },
      { id: "resenas",               label: "Reseñas",                 icon: Star },
    ],
  },
  {
    id: "contacto", label: "Contáctanos", icon: MessageSquare,
    subs: [
      { id: "consultoria",    label: "Consultoría",    icon: Calendar   },
      { id: "nuevo-proyecto", label: "Nuevo Proyecto", icon: PlusCircle },
    ],
  },
  {
    id: "pagos", label: "Métodos de Pago", icon: CreditCard,
    subs: [
      { id: "pago-movil", label: "Pago Móvil", icon: Smartphone      },
      { id: "zelle",      label: "Zelle",      icon: DollarSign      },
      { id: "airtm",      label: "AirTM",      icon: BadgeDollarSign },
      { id: "binance",    label: "Binance",    icon: DollarSign      },
      { id: "paypal",     label: "PayPal",     icon: DollarSign      },
      { id: "mercantil-pa", label: "Mercantil Panamá", icon: Landmark },
    ],
  },
];

/* Only visible to the admin role */
const ADMIN_SECTION: Section = {
  id: "admin", label: "Administración", icon: ShieldCheck,
  subs: [
    { id: "admin-clientes", label: "Clientes",        icon: Users },
    { id: "admin-correos",  label: "Correos Masivos", icon: Mail  },
    { id: "admin-solicitudes", label: "Solicitudes",  icon: Inbox },
    { id: "admin-pagos",       label: "Pagos",        icon: Wallet },
  ],
};

interface Props {
  children: React.ReactNode;
  activePanel: PanelId;
  onPanelChange: (id: PanelId) => void;
}

/* Sections that require a complete profile to access */
const LOCKED_PANELS: PanelId[] = [
  "consultoria", "nuevo-proyecto",
  "estatus-proyectos", "historial-proyectos", "proyectos-culminados",
  "historial", "estado-cuenta", "contratacion",
];

export default function DashboardLayout({ children, activePanel, onPanelChange }: Props) {
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const metodos = useMetodosPago(!!user);
  const sections = useMemo(() => {
    if (isAdmin) return [...SECTIONS, ADMIN_SECTION];
    // Users only see the payment methods that are active and configured (hidden while loading)
    const ids = new Set(metodos?.map((m) => m.id) ?? []);
    return SECTIONS
      .map((s) => (s.id === "pagos" ? { ...s, subs: s.subs.filter((x) => ids.has(x.id.replace("-", "_") as Metodo["id"])) } : s))
      .filter((s) => s.subs.length > 0);
  }, [isAdmin, metodos]);
  const { data, loading: perfilLoading } = usePersonalData();
  // Only regular users must complete their profile; admins are never gated
  const profileOk = isAdmin || isProfileComplete(data);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["perfil"]));
  const [toast, setToast] = useState(false);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Deep links (?panel=) go through the same rules as the menu: role and profile locks
  useEffect(() => {
    if (authLoading || perfilLoading) return;
    if ((activePanel.startsWith("admin-") && !isAdmin) || (!profileOk && LOCKED_PANELS.includes(activePanel))) onPanelChange("home");
  }, [activePanel, authLoading, perfilLoading, isAdmin, profileOk, onPanelChange]);

  function navigate(id: PanelId) {
    if (!profileOk && LOCKED_PANELS.includes(id)) {
      setToast(true);
      return;
    }
    onPanelChange(id);
    setSidebarOpen(false); // closes the mobile drawer; no effect on desktop
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-deep">
      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-40 h-[72px] flex items-center px-4 gap-3 border-b border-glass-bd"
        style={{ background: "rgba(8,14,26,0.95)", backdropFilter: "blur(20px)" }}
      >
        {/* Menu toggle — mobile only; on desktop the sidebar is always visible */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Abrir menú"
          className="lg:hidden p-1.5 rounded-lg text-silver hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo-icon.png"
            alt="Technosoftware"
            width={56}
            height={58}
            priority
            className="w-10 sm:w-14 h-auto drop-shadow-[0_0_6px_rgba(77,127,255,0.6)]"
          />
          <span className="font-brand font-bold text-xl text-[#f0f4ff] tracking-wide hidden sm:block">
            TECHNOSOFTWARE
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
          <Reloj className="hidden xl:inline-flex" />
          <EnlaceGestion />
          <SelectorIdioma />
          {user && (
            <div className="flex items-center gap-2 sm:px-3 sm:py-1.5 rounded-full sm:border border-glass-bd min-w-0 max-sm:!bg-transparent"
              style={{ background: "rgba(15,24,56,0.8)" }}>
              <span className="hidden sm:block w-2 h-2 rounded-full bg-status-green animate-pulse shrink-0" />
              <span className="hidden sm:block text-sm font-ui text-[#f0f4ff] max-w-[180px] truncate">{user.email}</span>
              <span className={cn("text-xs font-ui font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", isAdmin ? "text-cyan border-cyan/40 bg-cyan/10" : "text-silver border-glass-bd")}>
                {isAdmin ? "Admin" : "Usuario"}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-ui font-semibold text-white border border-red-700/40 hover:bg-red-900/30 hover:border-red-600/60 transition-all"
            style={{ background: "rgba(127,29,29,0.25)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "flex flex-col border-r border-glass-bd transition-all duration-300 overflow-hidden shrink-0",
            "fixed top-[72px] bottom-0 left-0 z-30 lg:static lg:z-auto",
            sidebarOpen ? "w-[min(255px,85vw)]" : "w-0 lg:w-[255px]"
          )}
          style={{ background: "rgba(8,14,26,0.9)", backdropFilter: "blur(12px)" }}
        >
          {/* Inicio */}
          <div className="p-3 border-b border-glass-bd">
            <button
              onClick={() => navigate("home")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-ui font-semibold transition-all",
                activePanel === "home"
                  ? "text-white"
                  : "text-silver hover:text-white hover:bg-white/5"
              )}
              style={activePanel === "home"
                ? { background: "linear-gradient(135deg, #1e3573 0%, #2a4aad 100%)" }
                : {}}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Inicio</span>
            </button>
          </div>

          {/* Sections */}
          <nav className="flex-1 overflow-y-auto py-2">
            {sections.map((section) => {
              const isOpen   = openSections.has(section.id);
              const isActive = section.subs.some((s) => s.id === activePanel);

              return (
                <div key={section.id} className="mb-0.5">
                  <p className="px-4 pt-3 pb-1 text-xs font-ui font-semibold uppercase tracking-widest text-silver/50">
                    {section.label}
                  </p>
                  {/* Section toggle */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-ui transition-all",
                      isActive
                        ? "text-white bg-blue-accent/10 border-r-2 border-blue-accent"
                        : "text-silver hover:text-white hover:bg-white/5"
                    )}
                  >
                    <section.icon className="w-4 h-4 shrink-0 text-silver/70" />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronRight
                      className={cn("w-3.5 h-3.5 text-silver/40 transition-transform duration-200", isOpen && "rotate-90")}
                    />
                  </button>

                  {/* Sub-items */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="subs"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {section.subs.map(({ id, label }) => {
                          const locked = !profileOk && LOCKED_PANELS.includes(id);
                          return (
                            <button
                              key={id}
                              onClick={() => navigate(id)}
                              className={cn(
                                "w-full flex items-center gap-2 pl-10 pr-4 py-2 text-xs font-ui transition-all border-l-2",
                                activePanel === id
                                  ? "text-cyan border-cyan/50 bg-blue-accent/5"
                                  : locked
                                  ? "text-silver/35 border-transparent cursor-not-allowed"
                                  : "text-silver/70 border-transparent hover:text-white hover:bg-white/5"
                              )}
                            >
                              <span className={cn("text-cyan text-xs", activePanel !== id && "invisible")} aria-hidden="true">›</span>
                              <span className="flex-1 text-left">{label}</span>
                              {locked && <Lock className="w-3 h-3 text-silver/30 shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-glass-bd">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-ui text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        {/* Tap outside the drawer to close it (mobile only) */}
        {sidebarOpen && <button aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 top-[72px] z-20 bg-black/50" />}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 relative">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: "linear-gradient(rgba(77,127,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(77,127,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* ── Profile gate toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 16, x: "-50%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-card-hover"
            style={{
              background: "rgba(20,12,0,0.92)",
              borderColor: "rgba(234,179,8,0.45)",
              backdropFilter: "blur(16px)",
            }}
          >
            <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs font-ui font-semibold text-yellow-400 uppercase tracking-widest">Sección bloqueada</p>
              <p className="text-xs text-silver mt-0.5">Completa tus datos personales para acceder.</p>
            </div>
            <button onClick={() => { setToast(false); onPanelChange("datos-personales"); }}
              className="ml-2 text-xs font-ui text-yellow-300 hover:underline whitespace-nowrap">
              Completar →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
