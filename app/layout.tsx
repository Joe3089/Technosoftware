import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Plus_Jakarta_Sans, Sora } from "next/font/google";
import TSLoader from "@/components/common/TSLoader";
import AsistenteChat from "@/components/asistente/AsistenteChat";
import IdiomaProvider from "@/components/i18n/IdiomaProvider";
import ParticleField from "@/components/common/ParticleField";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const sora = Sora({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05091a" };

export const metadata: Metadata = {
  title: "Technosoftware — Código que Hace la Diferencia",
  description:
    "Agencia de desarrollo y soporte tecnológico. Soluciones web, mobile, cloud e IA para empresas.",
  robots: { index: true, follow: true },
  // Link previews (WhatsApp, Facebook…); the image comes from app/opengraph-image.png
  openGraph: {
    type: "website",
    siteName: "Technosoftware",
    locale: "es_ES",
    title: "Technosoftware — Código que Hace la Diferencia",
    description: "Agencia de soporte y desarrollo de software: soluciones a medida para tu empresa.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${jakarta.variable} ${sora.variable}`}
    >
      <body className="font-body antialiased">
        <IdiomaProvider>
        <TSLoader />
        <ParticleField fixed count={40} lines={14} />
        {children}
        <AsistenteChat />
        </IdiomaProvider>
      </body>
    </html>
  );
}
