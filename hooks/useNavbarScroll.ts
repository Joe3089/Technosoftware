"use client";

import { useState, useEffect } from "react";

const SECTIONS = ["inicio", "quienes-somos", "proyectos", "contacto"];

export function useNavbarScroll() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const handleScroll = () => {
      // React bails out on same primitive; no extra guard needed for boolean
      setScrolled(window.scrollY > 60);

      let current = "inicio";
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          current = id;
        }
      }
      // Functional update: skip re-render when section hasn't changed
      setActiveSection((prev) => (prev === current ? prev : current));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrolled, activeSection };
}
