"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { ReactNode } from "react";
import ScrollReveal from "@/components/common/ScrollReveal";
import { cn } from "@/lib/utils";

const ABOUT_TABS = [
  { href: "/quienes-somos", label: "Quiénes Somos" },
  { href: "/mision", label: "Misión" },
  { href: "/vision", label: "Visión" },
];

interface InfoPageProps {
  eyebrow: string;
  title: string;
  highlight: string;
  statement: string;
  image: { src: string; width: number; height: number; alt: string };
  pillarsTitle: string;
  items: { icon: ReactNode; title: string; text: string }[];
  next: { href: string; label: string };
}

export default function InfoPage({ eyebrow, title, highlight, statement, image, pillarsTitle, items, next }: InfoPageProps) {
  const pathname = usePathname();

  return (
    <section className="relative pt-28 sm:pt-32 pb-20 sm:pb-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Heading + section switcher */}
        <ScrollReveal className="text-center mb-8 sm:mb-10">
          <span className="eyebrow mb-4 block">{eyebrow}</span>
          <h1 className="font-display text-[#f0f4ff]" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}>
            {title} <span className="text-gradient">{highlight}</span>
          </h1>
          <nav aria-label="Sobre nosotros" className="mt-6 inline-flex flex-wrap justify-center gap-1 p-1 rounded-full glass border border-glass-bd">
            {ABOUT_TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={pathname === t.href ? "page" : undefined}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-ui font-semibold uppercase tracking-wider transition-all duration-300",
                  pathname === t.href
                    ? "bg-gradient-cta text-white shadow-glow"
                    : "text-silver hover:text-white hover:bg-white/5"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </ScrollReveal>

        {/* Feature image with the statement card overlapping its bottom edge */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="group relative rounded-2xl overflow-hidden border border-glass-bd shadow-[0_8px_48px_rgba(0,0,0,0.5)]"
            style={{ aspectRatio: `${image.width} / ${image.height}` }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              quality={95}
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,9,26,0.85)] via-[rgba(5,9,26,0.15)] to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
          </motion.div>

          <motion.blockquote
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 mx-auto -mt-10 sm:-mt-20 lg:-mt-28 w-[calc(100%-1.5rem)] sm:w-[88%] lg:w-[78%] glass-heavy rounded-2xl border border-glass-bd p-6 sm:p-8 lg:p-10 shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
          >
            <span className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-gradient-to-b from-blue-accent to-cyan" />
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="shrink-0 p-2.5 sm:p-3 rounded-xl bg-blue-accent/10 border border-blue-accent/30">
                <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-cyan" />
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-mono text-xs sm:text-sm tracking-[0.25em] uppercase text-cyan">{eyebrow}</span>
                <p className="font-ui italic text-[#f0f4ff] leading-relaxed" style={{ fontSize: "clamp(1.05rem,2.2vw,1.5rem)" }}>
                  {statement}
                </p>
              </div>
            </div>
          </motion.blockquote>
        </div>

        {/* Pillars */}
        <ScrollReveal className="text-center mt-16 sm:mt-20 mb-8 sm:mb-10">
          <h2 className="font-display text-[#f0f4ff]" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>
            {pillarsTitle}
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map(({ icon, title, text }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.15 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass-card rounded-xl p-6 flex flex-col gap-3 hover:border-blue-accent/40 transition-colors"
            >
              <div className="p-3 w-fit rounded-xl bg-blue-accent/10 border border-blue-accent/20">
                {icon}
              </div>
              <h3 className="font-ui font-semibold text-lg text-[#f0f4ff]">{title}</h3>
              <p className="text-sm text-silver leading-relaxed">{text}</p>
            </motion.article>
          ))}
        </div>

        <ScrollReveal className="text-center mt-12">
          <Link href={next.href} className="btn-ghost text-sm">{next.label} →</Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
