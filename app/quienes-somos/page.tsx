import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AboutSection from "@/components/sections/AboutSection";

export const metadata: Metadata = { title: "Quiénes Somos — Technosoftware" };

export default function QuienesSomosPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
