"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Smartphone, Server, Bot, Cpu, Headphones, BarChart3 } from "lucide-react";

// All images share the "Páginas Web" size (1364x636), so the frame keeps one fixed size
const SLIDES: {
  category: string;
  Icon: typeof Globe;
  src: string;
  width: number;
  height: number;
  accent: string;
}[] = [
  { category: "Páginas Web", Icon: Globe, src: "/projects/web.png", width: 1364, height: 636, accent: "rgba(77,127,255,0.6)" },
  { category: "Apps Móviles", Icon: Smartphone, src: "/projects/mobile-w.jpg", width: 1364, height: 636, accent: "rgba(0,207,255,0.6)" },
  { category: "ERP", Icon: Server, src: "/projects/erp-w.jpg", width: 1364, height: 636, accent: "rgba(99,102,241,0.6)" },
  { category: "Inteligencia Artificial", Icon: Bot, src: "/projects/IA-w.jpg", width: 1364, height: 636, accent: "rgba(168,85,247,0.6)" },
  { category: "Reparación de PC", Icon: Cpu, src: "/projects/reparacion-w.jpg", width: 1364, height: 636, accent: "rgba(249,115,22,0.6)" },
  { category: "ATC IT", Icon: Headphones, src: "/projects/atc-w.jpg", width: 1364, height: 636, accent: "rgba(34,197,94,0.6)" },
  { category: "Análisis de Datos", Icon: BarChart3, src: "/projects/analisis-w.jpg", width: 1364, height: 636, accent: "rgba(236,72,153,0.6)" },
];

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function ProjectCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[current];
  const Icon = slide.Icon;
  const hasImage = !broken[slide.src];
  const ratio = slide.width / slide.height;

  return (
    <div
      className="relative w-full flex flex-col items-center gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Frame sized to the image: full width, but never taller than ~62vh nor wider than the file itself */}
      <div
        className="relative rounded-2xl overflow-hidden border border-glass-bd shadow-[0_4px_32px_rgba(0,0,0,0.4)] bg-navy-mid/40 transition-[width] duration-500"
        style={{
          aspectRatio: `${slide.width} / ${slide.height}`,
          width: `min(100%, ${slide.width}px, calc(62vh * ${ratio.toFixed(4)}))`,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={hasImage ? undefined : { background: `radial-gradient(ellipse at 30% 40%, ${slide.accent} 0%, rgba(8,14,26,0.95) 70%)` }}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {hasImage && (
              <>
                <Image
                  src={slide.src}
                  alt={slide.category}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  quality={95}
                  priority={current === 0}
                  className="object-cover"
                  onError={() => setBroken((b) => ({ ...b, [slide.src]: true }))}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(5,9,26,0.7)] to-transparent" />
              </>
            )}
            <div className={hasImage ? "absolute bottom-0 left-0 flex items-center gap-3 m-2 sm:m-4 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[rgba(5,9,26,0.8)] backdrop-blur-sm" : "flex flex-col items-center gap-4"}>
              <div className={`${hasImage ? "p-2 sm:p-2.5" : "p-4"} rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm`}>
                <Icon className={`${hasImage ? "w-5 h-5 sm:w-6 sm:h-6" : "w-10 h-10"} text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
              </div>
              <span className={`${hasImage ? "text-sm sm:text-lg" : "text-base"} font-ui font-semibold text-white/90 tracking-wide px-2 sm:px-4 text-center`}>
                {slide.category}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir a ${SLIDES[i].category}`}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-blue-accent w-4" : "bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
