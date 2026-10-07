"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}

const VARIANTS = {
  up:    { hidden: { opacity: 0, y: 28 },    visible: { opacity: 1, y: 0 } },
  left:  { hidden: { opacity: 0, x: -28 },   visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 28 },    visible: { opacity: 1, x: 0 } },
  none:  { hidden: { opacity: 0 },            visible: { opacity: 1 } },
};

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.08 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: delay / 1000 }}
      variants={VARIANTS[direction]}
    >
      {children}
    </motion.div>
  );
}
