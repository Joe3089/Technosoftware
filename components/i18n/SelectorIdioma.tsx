"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Globe } from "lucide-react";
import { IDIOMAS, idiomaInfo, type IdiomaId } from "@/lib/idiomas";
import { useIdioma } from "./IdiomaProvider";
import { cn } from "@/lib/utils";

/** Live clock in the time zone of the region of the selected language (e.g. pt-PT → Lisboa). */
export function Reloj({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  const { idioma } = useIdioma();
  const info = idiomaInfo(idioma);
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!ahora) return <span className={cn("inline-block w-24", className)} />;

  const hora = new Intl.DateTimeFormat(idioma, { hour: "2-digit", minute: "2-digit", second: compacto ? undefined : "2-digit", timeZone: info.zona }).format(ahora);
  const fecha = new Intl.DateTimeFormat(idioma, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: info.zona }).format(ahora);
  const offset = new Intl.DateTimeFormat("en", { timeZone: info.zona, timeZoneName: "shortOffset" }).formatToParts(ahora)
    .find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "";
  return (
    <span translate="no" className={cn("inline-flex items-center gap-1.5 font-mono text-xs text-silver tabular-nums", className)}
      title={`${info.ciudad} · ${info.zona} (${offset})`}>
      <Calendar className="w-3.5 h-3.5 text-cyan shrink-0" />
      {fecha}
      <Clock className="w-3.5 h-3.5 text-cyan shrink-0 ml-1" />
      {hora}
      {!compacto && <span className="text-silver/50 font-ui">{info.ciudad} · {offset}</span>}
    </span>
  );
}

/** Language picker (native select: accessible and comfortable on phones). */
export default function SelectorIdioma({ className }: { className?: string }) {
  const { idioma, cambiar } = useIdioma();
  return (
    <label translate="no" className={cn("relative inline-flex items-center gap-1.5 rounded-lg border border-glass-bd px-2 py-1.5 text-xs text-[#f0f4ff] hover:border-blue-accent/50 cursor-pointer", className)}>
      <Globe className="w-3.5 h-3.5 text-cyan shrink-0" aria-hidden="true" />
      <span className="sr-only">Idioma / Language</span>
      <select value={idioma} onChange={(e) => cambiar(e.target.value as IdiomaId)}
        className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]" aria-label="Idioma / Language">
        {/* Explicit colors: the native list otherwise inherits white text on a white popup (Windows) */}
        {IDIOMAS.map((i) => (
          <option key={i.id} value={i.id} className="bg-[#0b1430] text-[#f0f4ff]">{i.nombre}</option>
        ))}
      </select>
      <span className="font-ui font-semibold uppercase">{idioma === "es" ? "ES" : idioma}</span>
    </label>
  );
}
