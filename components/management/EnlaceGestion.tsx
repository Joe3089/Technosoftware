"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

/** Acceso a la plataforma interna; solo aparece si el servidor confirma que la cuenta es del equipo. */
export default function EnlaceGestion() {
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    fetch("/api/gestion/contexto").then((r) => setStaff(r.ok)).catch(() => setStaff(false));
  }, []);
  if (!staff) return null;
  return (
    <Link href="/dashboard/inicio" className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-ui font-semibold text-cyan hover:bg-cyan/20" title="Plataforma de gestión interna">
      <Briefcase className="w-3.5 h-3.5" /><span className="hidden sm:inline">Gestión</span>
    </Link>
  );
}
