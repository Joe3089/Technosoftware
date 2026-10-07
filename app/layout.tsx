import type { Metadata } from "next";
import { Bebas_Neue, Montserrat, Inter, Orbitron } from "next/font/google";
import TSLoader from "@/components/common/TSLoader";
import ParticleField from "@/components/common/ParticleField";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Technosoftware — Código que Hace la Diferencia",
  description:
    "Agencia de desarrollo y soporte tecnológico. Soluciones web, mobile, cloud e IA para empresas.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${montserrat.variable} ${inter.variable} ${orbitron.variable}`}
    >
      <body className="font-body antialiased">
        <TSLoader />
        <ParticleField fixed count={40} lines={14} />
        {children}
      </body>
    </html>
  );
}
