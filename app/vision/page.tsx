import type { Metadata } from "next";
import { Globe, Lightbulb, Bot, TrendingUp, Users, Award } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoPage from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Visión — Technosoftware" };

const ITEMS = [
  { icon: <Award className="w-6 h-6 text-blue-accent" />, title: "Referente regional", text: "Ser reconocidos como la agencia tecnológica de referencia en Latinoamérica por la calidad de nuestras soluciones." },
  { icon: <Lightbulb className="w-6 h-6 text-blue-accent" />, title: "Innovación constante", text: "Adoptar y aplicar las tecnologías emergentes antes que nadie para ofrecer ventajas reales a nuestros clientes." },
  { icon: <Bot className="w-6 h-6 text-blue-accent" />, title: "Inteligencia Artificial", text: "Integrar IA en cada producto para automatizar procesos y potenciar la toma de decisiones." },
  { icon: <Globe className="w-6 h-6 text-blue-accent" />, title: "Alcance global", text: "Expandir nuestra presencia a nuevos mercados manteniendo la cercanía con cada cliente." },
  { icon: <Users className="w-6 h-6 text-blue-accent" />, title: "Talento", text: "Formar un equipo multidisciplinario de alto nivel, comprometido con el crecimiento continuo." },
  { icon: <TrendingUp className="w-6 h-6 text-blue-accent" />, title: "Crecimiento sostenible", text: "Crecer junto a nuestros clientes, generando valor duradero para las empresas y la sociedad." },
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
          intro="Ser la empresa líder en desarrollo de software y soporte tecnológico de la región, reconocida por transformar ideas en soluciones digitales que trascienden y perduran."
          items={ITEMS}
          next={{ href: "/quienes-somos", label: "Conoce quiénes somos" }}
        />
      </main>
      <Footer />
    </>
  );
}
