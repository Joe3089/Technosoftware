"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1–5 star rating; interactive when `onChange` is given. */
export default function Estrellas({ valor, onChange, size = "sm", label }: {
  valor: number; onChange?: (v: number) => void; size?: "sm" | "lg"; label?: string;
}) {
  const cls = size === "lg" ? "w-7 h-7" : "w-4 h-4";
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : "img"} aria-label={label ?? `${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star className={cn(cls, n <= valor ? "fill-amber-400 text-amber-400" : "text-silver/40")} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`}
            onClick={() => onChange(n)} className="p-1 -m-0.5 rounded hover:scale-110 transition-transform">{icon}</button>
        ) : <span key={n}>{icon}</span>;
      })}
    </div>
  );
}
