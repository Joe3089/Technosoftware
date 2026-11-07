import { Quote } from "lucide-react";
import Estrellas from "@/components/common/Estrellas";

export interface Resena {
  id: string; nombre: string; empresa: string | null; calificacion: number; texto: string; created_at: string;
  estado?: "pendiente" | "publicada" | "oculta"; proyecto?: { nombre: string } | null;
}

export default function ResenaCard({ r, children }: { r: Resena; children?: React.ReactNode }) {
  const iniciales = r.nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <article className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-3">
        <Estrellas valor={r.calificacion} />
        <Quote className="w-5 h-5 text-cyan/50 shrink-0" />
      </div>
      <p className="text-sm text-silver leading-relaxed flex-1 break-words">“{r.texto}”</p>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-cta flex items-center justify-center text-sm font-ui font-bold text-white">{iniciales}</span>
        <div className="min-w-0">
          <p className="text-sm font-ui font-semibold text-[#f0f4ff] truncate">{r.nombre}</p>
          {r.empresa && <p className="text-xs text-silver/70 truncate">{r.empresa}</p>}
        </div>
      </div>
      {children}
    </article>
  );
}
