"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function TSLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    const fast = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) { clearInterval(fast); return p; }
        return p + Math.random() * 12;
      });
    }, 120);

    const hide = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), 250);
    }, 700);

    return () => { clearInterval(fast); clearTimeout(hide); };
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
          style={{ background: "rgba(5,9,26,0.92)", backdropFilter: "blur(12px)" }}
        >
          {/* Rings */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "#4d7fff", borderRightColor: "#00cfff" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full"
              style={{ border: "1.5px solid transparent", borderBottomColor: "rgba(77,127,255,0.5)" }}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
            <Image
              src="/logo.png"
              alt="Technosoftware"
              width={36}
              height={36}
              className="animate-spin-3d-slow"
            />
          </div>

          {/* Progress bar */}
          <div className="w-48 h-0.5 rounded-full bg-navy-mid overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #4d7fff, rgba(0,207,255,0.9))" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
