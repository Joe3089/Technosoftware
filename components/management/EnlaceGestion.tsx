"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

/** Acceso a la plataforma interna; solo aparece si el servidor confirma que la cuenta es del equipo. */
export default function EnlaceGestion({ variante = "boton" }: { variante?: "boton" | "menu" }) {
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    fetch("/api/gestion/contexto").then((r) => setStaff(r.ok)).catch(() => setStaff(false));
  }, []);
  if (!staff) return null;
  if (variante === "menu") return (
    <div>
      <p className="px-4 pt-3 pb-1 text-xs font-ui font-semibold uppercase tracking-widest text-silver/50">Gestión</p>
      <Link href="/dashboard/inicio" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-ui text-cyan hover:text-white hover:bg-white/5 transition-all">
        <Briefcase className="w-4 h-4 shrink-0" /><span className="flex-1 text-left">Gestión interna</span>
      </Link>
    </div>
  );
  return (
    <Link href="/dashboard/inicio" className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-ui font-semibold text-cyan hover:bg-cyan/20" title="Plataforma de gestión interna">
      <Briefcase className="w-3.5 h-3.5" /><span className="hidden sm:inline">Gestión</span>
    </Link>
  );
}
