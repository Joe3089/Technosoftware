"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/common/ScrollReveal";

const STATS = [
  { value: "200+", label: "Proyectos Entregados" },
  { value: "98%",  label: "Clientes Satisfechos" },
  { value: "8+",   label: "Años de Experiencia" },
  { value: "15",   label: "Países Alcanzados" },
];

const RINGS = [
  { size: 280, duration: 18, reverse: false, color: "rgba(77,127,255,0.25)" },
  { size: 200, duration: 12, reverse: true,  color: "rgba(0,207,255,0.2)"   },
  { size: 130, duration: 8,  reverse: false,  color: "rgba(77,127,255,0.35)" },
];

const CIRCUIT_DOTS = [0, 60, 120, 180, 240, 300].map((deg, i) => ({
  key: i,
  delay: i * 0.3,
  top:  `calc(50% + ${(Math.sin((deg * Math.PI) / 180) * 100).toFixed(3)}px - 4px)`,
  left: `calc(50% + ${(Math.cos((deg * Math.PI) / 180) * 100).toFixed(3)}px - 4px)`,
}));

export default function AboutSection() {
  return (
    <section id="quienes-somos" className="relative py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-16">
          <span className="eyebrow mb-4 block">Quiénes Somos</span>
          <h2 className="font-display text-[#f0f4ff]" style={{ fontSize: "var(--fs-title)" }}>
            EXPERTOS EN <span className="text-gradient">TECNOLOGÍA</span>
          </h2>
          <p className="mt-4 text-silver max-w-2xl mx-auto leading-relaxed">
            Somos un equipo multidisciplinario dedicado a construir soluciones tecnológicas
            que generan impacto real en los negocios de nuestros clientes alrededor del mundo.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Circuit visualization */}
          <ScrollReveal direction="left">
            <div className="relative flex items-center justify-center" style={{ height: "360px" }}>
              {RINGS.map((ring, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border"
                  style={{ width: ring.size, height: ring.size, borderColor: ring.color }}
                  animate={{ rotate: ring.reverse ? -360 : 360 }}
                  transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
                />
              ))}

              {/* Core — spinning logo */}
              <motion.div
                className="relative z-10 flex items-center justify-center"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/logo.png"
                  alt="Technosoftware"
                  width={160}
                  height={160}
                  className="animate-spin-3d drop-shadow-[0_0_24px_rgba(0,207,255,0.6)]"
                />
              </motion.div>

              {/* Circuit dots */}
              {CIRCUIT_DOTS.map(({ key, top, left, delay }) => (
                <motion.div
                  key={key}
                  className="absolute w-2 h-2 rounded-full bg-blue-accent/60"
                  style={{ top, left }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay }}
                />
              ))}
            </div>
          </ScrollReveal>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {STATS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card p-4 sm:p-6 rounded-xl flex flex-col gap-2"
              >
                <span className="font-mono text-2xl sm:text-3xl font-bold text-gradient">{value}</span>
                <span className="text-sm font-ui text-silver">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
