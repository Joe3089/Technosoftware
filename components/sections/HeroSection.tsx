"use client";

import { ArrowRight, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import ProjectCarousel from "@/components/common/ProjectCarousel";

const METRICS = [
  { value: "200+", label: "Proyectos" },
  { value: "98%",  label: "Satisfacción" },
  { value: "8+",   label: "Años" },
  { value: "15",   label: "Países" },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
};

const fadeIn = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,   transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden"
    >
      {/* Gradient orbs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/4 w-[min(500px,90vw)] h-[min(500px,90vw)] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(77,127,255,0.18) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(0,207,255,0.1) 0%, transparent 70%)" }}
      />

      <motion.div
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center gap-8"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
      >
        {/* Project Carousel */}
        <motion.div variants={fadeIn} className="w-full">
          <ProjectCarousel />
        </motion.div>

        {/* Heading */}
        <motion.h1 variants={fadeUp} className="flex flex-col gap-1">
          <span className="font-display text-white" style={{ fontSize: "clamp(2rem,4.5vw,3.6rem)" }}>
            CÓDIGO QUE HACE LA DIFERENCIA
          </span>
          <span className="font-display text-blue-accent" style={{ fontSize: "clamp(1.8rem,3.8vw,3rem)" }}>
            INNOVACIÓN QUE TRASCIENDE
          </span>
          <span className="font-display text-white" style={{ fontSize: "clamp(1.4rem,3vw,2.4rem)" }}>
            SOLUCIONES QUE PERDURAN
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-sm sm:text-base text-silver max-w-xl leading-relaxed">
          Transformamos ideas en productos digitales de alto impacto. Desarrollo
          web, mobile, cloud, IA y soporte técnico para empresas que quieren
          liderar su industria.
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
          <a href="#proyectos" className="btn-primary text-sm">
            Ver Proyectos
            <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#contacto" className="btn-ghost text-sm">
            <MessageSquare className="w-4 h-4" />
            Hablar con Experto
          </a>
        </motion.div>

        {/* Metrics */}
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl mt-4"
        >
          {METRICS.map(({ value, label }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className="glass rounded-xl p-4 flex flex-col items-center gap-1 hover:shadow-glow transition-shadow duration-300"
            >
              <span className="font-mono text-2xl font-bold text-gradient">{value}</span>
              <span className="text-xs font-ui uppercase tracking-wider text-silver">{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

    </section>
  );
}
