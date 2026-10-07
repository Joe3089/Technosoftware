"use client";

import { Server, ShoppingCart, Cloud, Bot, BarChart3, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/common/ScrollReveal";
import { Badge } from "@/components/ui/badge";

const PROJECTS = [
  {
    icon: Server, name: "ERP Empresarial", category: "Web",
    description: "Sistema de gestión integral para medianas y grandes empresas. Módulos de RRHH, finanzas, inventario y logística unificados.",
    tags: ["React", "Node.js", "PostgreSQL"], badgeVariant: "default" as const,
  },
  {
    icon: ShoppingCart, name: "AppFlow Commerce", category: "Mobile",
    description: "Plataforma e-commerce mobile-first con checkout en 3 pasos, pagos integrados y analytics en tiempo real.",
    tags: ["React Native", "Stripe", "Firebase"], badgeVariant: "cyan" as const,
  },
  {
    icon: Cloud, name: "CloudNet Gateway", category: "Cloud",
    description: "Infraestructura cloud escalable con auto-scaling, balanceo de carga y monitoreo proactivo 24/7.",
    tags: ["AWS", "Terraform", "Kubernetes"], badgeVariant: "silver" as const,
  },
  {
    icon: Bot, name: "AI Support Desk", category: "IA",
    description: "Asistente virtual con IA para soporte al cliente. Resolución autónoma del 78% de tickets sin intervención humana.",
    tags: ["Claude API", "Python", "Vector DB"], badgeVariant: "cyan" as const,
  },
  {
    icon: BarChart3, name: "DataSight Dashboard", category: "Analytics",
    description: "Panel de inteligencia de negocio con visualizaciones interactivas, alertas configurables y exportación automática.",
    tags: ["D3.js", "BigQuery", "dbt"], badgeVariant: "default" as const,
  },
  {
    icon: Headphones, name: "TechSupport Pro", category: "Soporte",
    description: "Plataforma de gestión de tickets con SLA automático, base de conocimiento IA y reportes de desempeño del equipo.",
    tags: ["Next.js", "Redis", "Webhooks"], badgeVariant: "silver" as const,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: i * 0.07 },
  }),
};

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
          {PROJECTS.map((project, i) => {
            const Icon = project.icon;
            return (
              <motion.article
                key={project.name}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.08 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="glass-card rounded-xl p-6 flex flex-col gap-4 cursor-default"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="p-3 rounded-xl bg-blue-accent/10 border border-blue-accent/20 group-hover:border-blue-accent/40 transition-colors">
                    <Icon className="w-6 h-6 text-blue-accent" />
                  </div>
                  <Badge variant={project.badgeVariant}>{project.category}</Badge>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <h3 className="font-ui font-semibold text-lg text-[#f0f4ff]">{project.name}</h3>
                  <p className="text-sm text-silver leading-relaxed">{project.description}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-glass-bd">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-xs font-mono text-silver/60 bg-white/5 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        <ScrollReveal className="text-center mt-12">
          <a href="#contacto" className="btn-ghost text-sm">Ver todos los proyectos →</a>
        </ScrollReveal>
      </div>
    </section>
  );
}
