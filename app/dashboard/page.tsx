"use client";

import { useState } from "react";
import DashboardLayout, { type PanelId } from "@/components/dashboard/DashboardLayout";
import BentoGrid from "@/components/dashboard/BentoGrid";
import PersonalDataPanel from "@/components/dashboard/panels/PersonalDataPanel";
import ProyectosPanel from "@/components/dashboard/panels/ProyectosPanel";
import ContactoPanel from "@/components/dashboard/panels/ContactoPanel";
import PagosPanel from "@/components/dashboard/panels/PagosPanel";
import ClientesPanel from "@/components/dashboard/panels/admin/ClientesPanel";
import CorreosPanel from "@/components/dashboard/panels/admin/CorreosPanel";
/* Panels that map to Proyectos section subs */
const PROYECTO_PANELS: PanelId[] = ["historial-proyectos", "estatus-proyectos", "proyectos-culminados"];
/* Panels that map to Contacto section subs */
const CONTACTO_PANELS: PanelId[] = ["consultoria", "nuevo-proyecto"];
/* Panels that map to Pagos section subs */
const PAGOS_PANELS: PanelId[] = ["pago-movil", "zelle", "airtm", "binance", "paypal"];

function ActivePanel({ id, onNavigate }: { id: PanelId; onNavigate: (p: PanelId) => void }) {
  if (id === "home")           return <BentoGrid onNavigate={onNavigate} />;
  if (id === "datos-personales" || id === "historial" || id === "estado-cuenta")
                               return <PersonalDataPanel />;
  if (PROYECTO_PANELS.includes(id)) return <ProyectosPanel />;
  if (CONTACTO_PANELS.includes(id)) return <ContactoPanel />;
  if (PAGOS_PANELS.includes(id))    return <PagosPanel />;
  if (id === "admin-clientes")      return <ClientesPanel />;
  if (id === "admin-correos")       return <CorreosPanel />;
  return <BentoGrid onNavigate={onNavigate} />;
}

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<PanelId>("home");

  return (
    <DashboardLayout activePanel={activePanel} onPanelChange={setActivePanel}>
      <ActivePanel id={activePanel} onNavigate={setActivePanel} />
    </DashboardLayout>
  );
}
