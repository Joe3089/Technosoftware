"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, User, FolderOpen, MessageSquare, CreditCard,
  LogOut, ChevronRight, Menu, X, History, BarChart2,
  CheckSquare, Calendar, PlusCircle, Smartphone, DollarSign,
  FileText, BadgeDollarSign, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalData, isProfileComplete } from "@/hooks/usePersonalData";

export type PanelId =
  | "home"
  | "datos-personales" | "historial" | "estado-cuenta"
  | "historial-proyectos" | "estatus-proyectos" | "proyectos-culminados"
  | "consultoria" | "nuevo-proyecto"
  | "pago-movil" | "zelle" | "airtm" | "binance" | "paypal";

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
    ],
  },
];

interface Props {
  children: React.ReactNode;
  activePanel: PanelId;
  onPanelChange: (id: PanelId) => void;
}

/* Sections that require a complete profile to access */
const LOCKED_PANELS: PanelId[] = [
  "consultoria", "nuevo-proyecto",
  "estatus-proyectos", "historial-proyectos", "proyectos-culminados",
  "historial", "estado-cuenta",
];

export default function DashboardLayout({ children, activePanel, onPanelChange }: Props) {
  const { user, logout } = useAuth();
  const { data } = usePersonalData();
  const profileOk = isProfileComplete(data);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  function navigate(id: PanelId) {
    if (!profileOk && LOCKED_PANELS.includes(id)) {
      setToast(true);
      return;
    }
    onPanelChange(id);
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-deep">
      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center px-4 gap-3 border-b border-glass-bd"
        style={{ background: "rgba(8,14,26,0.95)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-silver hover:text-white hover:bg-white/5 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt="Technosoftware"
            width={30}
            height={30}
            className="animate-spin-3d-slow drop-shadow-[0_0_6px_rgba(77,127,255,0.6)]"
          />
          <span className="font-display text-sm text-[#f0f4ff] tracking-widest hidden sm:block">
            TECHNOSOFTWARE
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-glass-bd"
              style={{ background: "rgba(15,24,56,0.8)" }}>
              <span className="w-2 h-2 rounded-full bg-status-green animate-pulse shrink-0" />
              <span className="text-sm font-ui text-[#f0f4ff] max-w-[180px] truncate">{user.email}</span>
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
            sidebarOpen ? "w-[255px]" : "w-0"
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
            {SECTIONS.map((section) => {
              const isOpen   = openSections.has(section.id);
              const isActive = section.subs.some((s) => s.id === activePanel);

              return (
                <div key={section.id} className="mb-0.5">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/50">
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
                              <span className="text-silver/40 text-[10px]">›</span>
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
        <main className="flex-1 overflow-y-auto p-6 relative">
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
