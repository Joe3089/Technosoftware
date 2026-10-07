import type { Metadata } from "next";
import { Trophy, Rocket, BrainCircuit, Layers, RefreshCw, Building2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoPage from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Visión — Technosoftware" };

const ITEMS = [
  { icon: <Trophy className="w-6 h-6 text-blue-accent" />, title: "Liderazgo digital", text: "Ser el referente en evolución digital del sector corporativo, marcando el rumbo de la industria." },
  { icon: <Rocket className="w-6 h-6 text-blue-accent" />, title: "Espíritu pionero", text: "Adoptar primero las tecnologías emergentes y convertirlas en ventajas reales para nuestros clientes." },
  { icon: <BrainCircuit className="w-6 h-6 text-blue-accent" />, title: "Gestión inteligente", text: "Integrar inteligencia artificial y analítica en arquitecturas que ayudan a decidir mejor y más rápido." },
  { icon: <Layers className="w-6 h-6 text-blue-accent" />, title: "Escalabilidad", text: "Diseñar soluciones que crecen al ritmo de cada empresa, sin perder rendimiento ni seguridad." },
  { icon: <RefreshCw className="w-6 h-6 text-blue-accent" />, title: "Innovación continua", text: "Mejorar constantemente nuestros productos y procesos para mantenernos siempre un paso adelante." },
  { icon: <Building2 className="w-6 h-6 text-blue-accent" />, title: "Impacto corporativo", text: "Transformar la manera en que las organizaciones operan, colaboran y generan valor." },
];

export default function VisionPage() {
  return (
    <>
      <Navbar />
      <main>
        <InfoPage
          eyebrow="Visión"
          title="NUESTRA"
          highlight="VISIÓN"
          statement="Liderar la evolución digital en el sector corporativo, siendo pioneros en la integración de arquitecturas de gestión inteligentes, escalables y orientadas a la innovación continua."
          image={{ src: "/about/vision.jpg", width: 2400, height: 937, alt: "Reunión corporativa revisando un panel de control de gestión" }}
          pillarsTitle="HACIA DÓNDE VAMOS"
          items={ITEMS}
          next={{ href: "/quienes-somos", label: "Conoce quiénes somos" }}
        />
      </main>
      <Footer />
    </>
  );
}
