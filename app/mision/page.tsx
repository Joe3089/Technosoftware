import type { Metadata } from "next";
import { Target, Code2, Handshake, ShieldCheck, Rocket, Headphones } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoPage from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Misión — Technosoftware" };

const ITEMS = [
  { icon: <Target className="w-6 h-6 text-blue-accent" />, title: "Soluciones a medida", text: "Diseñamos software que responde a las necesidades reales de cada negocio, no plantillas genéricas." },
  { icon: <Code2 className="w-6 h-6 text-blue-accent" />, title: "Calidad técnica", text: "Aplicamos buenas prácticas, código limpio y pruebas para entregar productos estables y mantenibles." },
  { icon: <Headphones className="w-6 h-6 text-blue-accent" />, title: "Soporte cercano", text: "Acompañamos a nuestros clientes con soporte técnico especializado antes, durante y después de cada entrega." },
  { icon: <ShieldCheck className="w-6 h-6 text-blue-accent" />, title: "Seguridad", text: "Protegemos la información de nuestros clientes con estándares de seguridad desde el diseño." },
  { icon: <Handshake className="w-6 h-6 text-blue-accent" />, title: "Confianza", text: "Construimos relaciones a largo plazo basadas en transparencia, compromiso y resultados medibles." },
  { icon: <Rocket className="w-6 h-6 text-blue-accent" />, title: "Impacto", text: "Impulsamos la transformación digital para que las empresas sean más eficientes y competitivas." },
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
          intro="Brindar soluciones tecnológicas innovadoras, seguras y a la medida —desarrollo de software, soporte técnico y consultoría— que ayuden a las empresas a optimizar sus procesos, crecer y alcanzar sus objetivos."
          items={ITEMS}
          next={{ href: "/vision", label: "Conoce nuestra visión" }}
        />
      </main>
      <Footer />
    </>
  );
}
