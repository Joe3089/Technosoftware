import type { Metadata } from "next";
import { Code2, Headphones, ShieldCheck, Handshake, Rocket, Globe2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InfoPage from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Quiénes Somos — Technosoftware" };

const ITEMS = [
  { icon: <Code2 className="w-6 h-6 text-blue-accent" />, title: "Desarrollo a medida", text: "Aplicaciones web y móviles, sistemas ERP y plataformas diseñadas según los procesos reales de cada empresa." },
  { icon: <Headphones className="w-6 h-6 text-blue-accent" />, title: "Soporte técnico", text: "Acompañamiento continuo, mantenimiento y atención cercana para que tu operación nunca se detenga." },
  { icon: <ShieldCheck className="w-6 h-6 text-blue-accent" />, title: "Seguridad y calidad", text: "Buenas prácticas, pruebas y protección de datos en cada línea de código que entregamos." },
  { icon: <Handshake className="w-6 h-6 text-blue-accent" />, title: "Trabajo en equipo", text: "Involucramos a nuestros clientes en cada etapa, con comunicación clara y avances visibles." },
  { icon: <Rocket className="w-6 h-6 text-blue-accent" />, title: "Innovación constante", text: "Adoptamos tecnologías modernas para que tus soluciones sean escalables y estén listas para el futuro." },
  { icon: <Globe2 className="w-6 h-6 text-blue-accent" />, title: "Alcance internacional", text: "Atendemos empresas en distintos países, adaptándonos a sus monedas, horarios y necesidades." },
];

export default function QuienesSomosPage() {
  return (
    <>
      <Navbar />
      <main>
        <InfoPage
          eyebrow="Quiénes Somos"
          title="EXPERTOS EN"
          highlight="TECNOLOGÍA"
          statement="Somos Technosoftware, una agencia de soporte y desarrollo de software que transforma ideas y procesos en soluciones digitales confiables, cercanas y a la medida de cada negocio."
          body={[
            "Nacimos con el propósito de acercar la tecnología a empresas de todos los tamaños. Reunimos a desarrolladores, analistas, diseñadores y especialistas en soporte que trabajan como un solo equipo para entender a fondo cada operación antes de escribir la primera línea de código.",
            "Diseñamos, construimos e implementamos aplicaciones web y móviles, sistemas ERP y plataformas de gestión que integran finanzas, inventario, ventas y talento humano. Pero nuestro compromiso no termina en la entrega: acompañamos a cada cliente con soporte técnico, capacitación y mejoras continuas para que la tecnología siga generando valor con el paso del tiempo.",
            "Creemos en las relaciones de largo plazo, en la comunicación transparente y en resultados medibles. Por eso cada proyecto se gestiona con etapas claras, avances visibles y un equipo disponible para responder cuando más se necesita.",
          ]}
          image={{ src: "/about/quienes-somos.jpg", width: 2400, height: 1340, alt: "Equipo de Technosoftware planificando un proyecto en la oficina" }}
          pillarsTitle="LO QUE NOS DEFINE"
          items={ITEMS}
          next={{ href: "/mision", label: "Conoce nuestra misión" }}
        />
      </main>
      <Footer />
    </>
  );
}
