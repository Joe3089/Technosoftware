import type { Metadata } from "next";
import { Compass, Unlock, Boxes, Workflow, Users, Headphones } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoPage from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Misión — Technosoftware" };

const ITEMS = [
  { icon: <Compass className="w-6 h-6 text-blue-accent" />, title: "Guía hacia el futuro digital", text: "Acompañamos a cada organización en su transformación digital, de la planificación a la puesta en marcha." },
  { icon: <Unlock className="w-6 h-6 text-blue-accent" />, title: "Tecnología accesible", text: "Democratizamos el acceso a herramientas de gestión empresarial para empresas de todos los tamaños." },
  { icon: <Boxes className="w-6 h-6 text-blue-accent" />, title: "Sistemas ERP", text: "Implementamos y adaptamos ERP que integran finanzas, inventario, ventas y RRHH en un solo lugar." },
  { icon: <Workflow className="w-6 h-6 text-blue-accent" />, title: "Menos complejidad", text: "Simplificamos procesos operativos para que los equipos dediquen su tiempo a lo que realmente aporta valor." },
  { icon: <Users className="w-6 h-6 text-blue-accent" />, title: "Talento humano", text: "Ponemos la tecnología al servicio de las personas, potenciando sus capacidades y su productividad." },
  { icon: <Headphones className="w-6 h-6 text-blue-accent" />, title: "Soporte cercano", text: "Brindamos soporte técnico especializado antes, durante y después de cada implementación." },
];

export default function MisionPage() {
  return (
    <>
      <Navbar />
      <main>
        <InfoPage
          eyebrow="Misión"
          title="NUESTRA"
          highlight="MISIÓN"
          statement="Guiar a las organizaciones hacia el futuro digital, democratizando el acceso a tecnologías de gestión empresarial y sistemas ERP que simplifiquen la complejidad operativa y potencien el talento humano."
          image={{ src: "/about/mision.jpg", width: 2400, height: 1340, alt: "Equipo de Technosoftware presentando un sistema de gestión empresarial" }}
          pillarsTitle="CÓMO LO HACEMOS"
          items={ITEMS}
          next={{ href: "/vision", label: "Conoce nuestra visión" }}
        />
      </main>
      <Footer />
    </>
  );
}
