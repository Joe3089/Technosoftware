"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import ScrollReveal from "@/components/common/ScrollReveal";

interface InfoPageProps {
  eyebrow: string;
  title: string;
  highlight: string;
  intro: string;
  items: { icon: ReactNode; title: string; text: string }[];
  next: { href: string; label: string };
}

export default function InfoPage({ eyebrow, title, highlight, intro, items, next }: InfoPageProps) {
  return (
    <section className="relative pt-32 pb-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-12 sm:mb-16">
          <span className="eyebrow mb-4 block">{eyebrow}</span>
          <h1 className="font-display text-[#f0f4ff]" style={{ fontSize: "clamp(2.2rem,6vw,4.5rem)" }}>
            {title} <span className="text-gradient">{highlight}</span>
          </h1>
          <p className="mt-6 text-sm sm:text-base text-silver max-w-3xl mx-auto leading-relaxed">{intro}</p>
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
              className="glass-card rounded-xl p-6 flex flex-col gap-3"
            >
              <div className="p-3 w-fit rounded-xl bg-blue-accent/10 border border-blue-accent/20">
                {icon}
              </div>
              <h2 className="font-ui font-semibold text-lg text-[#f0f4ff]">{title}</h2>
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
