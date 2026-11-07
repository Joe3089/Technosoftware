"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/common/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Captura = { src: string; alt: string };
type Proyecto = {
  name: string; category: string; description: string; tags: string[];
  badgeVariant: "default" | "cyan" | "silver"; capturas: Captura[]; destacado?: boolean;
};

const img = (archivo: string, alt: string): Captura => ({ src: `/projects/portafolio/${archivo}.webp`, alt });

const PROJECTS: Proyecto[] = [
  {
    name: "Sasa", category: "Sistema de gestión", destacado: true,
    description: "Sistema de gestión para comercios: punto de venta con control de cajas, inventario, compras a proveedores, producción por recetas, gastos, clientes y reportes con gráficos. Incluye asistente con IA.",
    tags: ["POS", "Inventario", "Producción", "Reportes", "IA"], badgeVariant: "cyan",
    capturas: [
      img("sasa-dashboard", "Sasa: dashboard con tareas y actividad reciente"),
      img("sasa-pos", "Sasa: punto de venta con historial de caja"),
      img("sasa-inventario", "Sasa: inventario de productos"),
      img("sasa-reportes", "Sasa: reportes con gráficos"),
    ],
  },
  {
    name: "FerreVascal 7073", category: "E-commerce",
    description: "Tienda online de ferretería con catálogo por categorías, precios en USD y bolívares y pedidos directos por WhatsApp.",
    tags: ["Catálogo", "Carrito", "WhatsApp"], badgeVariant: "default",
    capturas: [
      img("ferrevascal-inicio", "FerreVascal: página de inicio"),
      img("ferrevascal-catalogo", "FerreVascal: catálogo de productos"),
      img("ferrevascal-productos", "FerreVascal: productos con precios"),
    ],
  },
  {
    name: "Quiniela Mundial 2026", category: "Web",
    description: "Plataforma de pronósticos del Mundial 2026: partidos, grupos, ranking en vivo, selecciones, estadísticas históricas y noticias.",
    tags: ["Pronósticos", "Ranking", "Estadísticas"], badgeVariant: "cyan",
    capturas: [
      img("quiniela-inicio", "Quiniela Mundial 2026: inicio"),
      img("quiniela-partido", "Quiniela Mundial 2026: detalle de partido"),
      img("quiniela-ranking", "Quiniela Mundial 2026: ranking global"),
      img("quiniela-estadisticas", "Quiniela Mundial 2026: estadísticas"),
    ],
  },
  {
    name: "OptiSoft", category: "Escritorio",
    description: "Sistema de gestión para ópticas: registro de ópticas y clientes, pagos de consultas, reportes médicos y estadísticos con gráficos.",
    tags: ["Gestión", "Pagos", "Reportes"], badgeVariant: "silver",
    capturas: [
      img("optisoft-inicio", "OptiSoft: panel de inicio"),
      img("optisoft-reportes", "OptiSoft: reportes estadísticos"),
      img("optisoft-graficos", "OptiSoft: gráficos de consultas"),
      img("optisoft-login", "OptiSoft: inicio de sesión"),
    ],
  },
  {
    name: "Optimizador de Funciones", category: "Escritorio",
    description: "Aplicación de escritorio para métodos de optimización (Armijo, Wolfe, Fibonacci, búsqueda local) con gráficas 2D/3D, asistente IA y reportes exportables.",
    tags: ["Python", "Qt", "Gráficas 3D", "IA"], badgeVariant: "default",
    capturas: [
      img("optimizador-inicio", "Optimizador de Funciones: pantalla de inicio"),
      img("optimizador-panel", "Optimizador de Funciones: panel de control"),
      img("optimizador-graficas", "Optimizador de Funciones: gráficas del método de Armijo"),
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: i * 0.07 },
  }),
};

function ProyectoCard({ project, i }: { project: Proyecto; i: number }) {
  const [activa, setActiva] = useState(0);
  const portada = project.capturas[activa];
  return (
    <motion.article
      custom={i}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={cn("glass-card rounded-xl overflow-hidden flex flex-col", project.destacado && "lg:col-span-2")}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
    >
      <div className="relative aspect-[16/9] bg-navy-mid/40 border-b border-glass-bd">
        <Image key={portada.src} src={portada.src} alt={portada.alt} fill
          sizes={project.destacado ? "(min-width: 1024px) 800px, 100vw" : "(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"}
          className="object-contain p-2 animate-in fade-in duration-300" />
        <Badge variant={project.badgeVariant} className="absolute top-3 right-3 backdrop-blur-sm">{project.category}</Badge>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="flex gap-2" role="tablist" aria-label={`Capturas de ${project.name}`}>
          {project.capturas.map((c, j) => (
            <button key={c.src} type="button" role="tab" aria-selected={j === activa} aria-label={c.alt}
              onClick={() => setActiva(j)}
              className={cn("relative h-10 w-16 rounded-md overflow-hidden border transition-all",
                j === activa ? "border-cyan ring-1 ring-cyan/50" : "border-glass-bd opacity-60 hover:opacity-100")}>
              <Image src={c.src} alt="" fill sizes="64px" className="object-cover object-top" />
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <h3 translate="no" className="font-ui font-semibold text-lg text-[#f0f4ff]">{project.name}</h3>
          <p className="text-sm text-silver leading-relaxed">{project.description}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-glass-bd">
          {project.tags.map((tag) => (
            <span key={tag} className="text-xs font-mono text-silver/60 bg-white/5 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function ProjectsSection() {
  return (
    <section id="proyectos" className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-16">
          <span className="eyebrow mb-4 block">Proyectos</span>
          <h2 className="font-display text-[#f0f4ff]" style={{ fontSize: "var(--fs-title)" }}>
            SOLUCIONES QUE <span className="text-gradient">IMPACTAN</span>
          </h2>
          <p className="mt-4 text-silver max-w-2xl mx-auto">
            Cada proyecto es una historia de éxito. Tecnología de vanguardia aplicada a problemas reales de negocio.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project, i) => (
            <ProyectoCard key={project.name} project={project} i={i} />
          ))}
        </div>

        <ScrollReveal className="text-center mt-12">
          <a href="#contacto" className="btn-ghost text-sm">¿Quieres un proyecto así? Contáctanos →</a>
        </ScrollReveal>
      </div>
    </section>
  );
}
