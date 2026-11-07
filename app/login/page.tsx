import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";
import SelectorIdioma, { Reloj } from "@/components/i18n/SelectorIdioma";

export const metadata = {
  title: "Acceder — Technosoftware",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-navy-deep pt-20 pb-8 sm:py-0">
      <Link href="/" className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-lg border border-glass-bd px-3 py-1.5 text-xs sm:text-sm font-ui font-semibold text-[#f0f4ff] hover:border-blue-accent/50 hover:bg-white/5 transition-colors">
        <ArrowLeft className="w-4 h-4 text-cyan" /> Volver a la página
      </Link>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <Reloj compacto className="hidden sm:inline-flex" />
        <SelectorIdioma />
      </div>
      {/* Orbs decorativos */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,207,255,0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(77,127,255,0.12) 0%, transparent 70%)",
        }}
      />
      <AuthCard />
    </main>
  );
}
