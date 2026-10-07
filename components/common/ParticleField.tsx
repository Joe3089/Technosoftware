"use client";

import { useEffect, useRef } from "react";

export default function ParticleField({ count = 26, lines = 8, fixed = false }: { count?: number; lines?: number; fixed?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Inject keyframes once into <head> so they survive re-renders
    const style = document.createElement("style");
    style.textContent = `
      @keyframes particleFloat {
        0%   { transform: translateY(0) scale(1); }
        100% { transform: translateY(-40px) scale(1.5); }
      }
      @keyframes lineFloat {
        0%   { top: -100px; opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { top: 110%; opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const elements: HTMLDivElement[] = [];

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 3 + 1;
      const duration = Math.random() * 16 + 10;
      const delay = Math.random() * 14;
      const opacity = Math.random() * 0.4 + 0.1;

      p.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        background:rgba(77,127,255,${opacity});border-radius:50%;
        left:${Math.random() * 100}%;top:${Math.random() * 100}%;
        animation:particleFloat ${duration}s ${delay}s ease-in-out infinite alternate;
        pointer-events:none;
      `;
      container.appendChild(p);
      elements.push(p);
    }

    for (let i = 0; i < lines; i++) {
      const line = document.createElement("div");
      const duration = Math.random() * 8 + 6;
      const delay = Math.random() * 8;
      const opacity = Math.random() * 0.5 + 0.2;

      line.style.cssText = `
        position:absolute;width:1px;height:${Math.random() * 80 + 40}px;
        background:linear-gradient(to bottom,transparent,rgba(0,207,255,${opacity}),transparent);
        left:${Math.random() * 100}%;top:-100px;
        animation:lineFloat ${duration}s ${delay}s linear infinite;
        pointer-events:none;
      `;
      container.appendChild(line);
      elements.push(line);
    }

    return () => {
      elements.forEach((el) => el.remove());
      style.remove();
    };
  }, [count, lines]);

  return (
    <div
      ref={containerRef}
      className={`${fixed ? "fixed z-0" : "absolute"} inset-0 overflow-hidden pointer-events-none`}
      aria-hidden="true"
    />
  );
}
