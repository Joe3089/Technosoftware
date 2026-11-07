"use client";

import { useEffect, useState } from "react";
import ScrollReveal from "@/components/common/ScrollReveal";
import ResenaCard, { type Resena } from "@/components/resenas/ResenaCard";

/** Published client reviews; the section hides itself until there is at least one. */
export default function ResenasSection() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  useEffect(() => {
    fetch("/api/resenas").then((r) => (r.ok ? r.json() : { resenas: [] })).then((j) => setResenas(j.resenas ?? [])).catch(() => {});
  }, []);
  if (!resenas.length) return null;

  const promedio = resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length;
  return (
    <section id="resenas" className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <span className="eyebrow mb-4 block">Reseñas</span>
          <h2 className="font-display text-[#f0f4ff]" style={{ fontSize: "var(--fs-title)" }}>
            LO QUE DICEN <span className="text-gradient">NUESTROS CLIENTES</span>
          </h2>
          <p className="mt-4 text-silver">
            {promedio.toFixed(1)} de 5 · {resenas.length} {resenas.length === 1 ? "reseña verificada" : "reseñas verificadas"}
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {resenas.slice(0, 6).map((r) => <ResenaCard key={r.id} r={r} />)}
        </div>
      </div>
    </section>
  );
}
