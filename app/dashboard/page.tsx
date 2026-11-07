"use client";

import { useEffect, useState } from "react";
import DashboardLayout, { type PanelId } from "@/components/dashboard/DashboardLayout";
import BentoGrid from "@/components/dashboard/BentoGrid";
import HistorialPanel from "@/components/dashboard/panels/HistorialPanel";
import BilleteraPanel from "@/components/dashboard/panels/BilleteraPanel";
import PersonalDataPanel from "@/components/dashboard/panels/PersonalDataPanel";
import HistorialProyectosPanel from "@/components/dashboard/panels/proyectos/HistorialProyectosPanel";
import EstatusProyectosPanel from "@/components/dashboard/panels/proyectos/EstatusProyectosPanel";
import CulminadosPanel from "@/components/dashboard/panels/proyectos/CulminadosPanel";
import ContratacionPanel from "@/components/dashboard/panels/proyectos/ContratacionPanel";
import ResenasPanel from "@/components/dashboard/panels/ResenasPanel";
import ConsultoriaPanel from "@/components/dashboard/panels/ConsultoriaPanel";
import NuevoProyectoPanel from "@/components/dashboard/panels/NuevoProyectoPanel";
import SolicitudesPanel from "@/components/dashboard/panels/admin/SolicitudesPanel";
import PagosAdminPanel from "@/components/dashboard/panels/admin/PagosAdminPanel";
import PagosPanel from "@/components/dashboard/panels/PagosPanel";
import ClientesPanel from "@/components/dashboard/panels/admin/ClientesPanel";
import CorreosPanel from "@/components/dashboard/panels/admin/CorreosPanel";
/* Panels that map to Proyectos section subs */
/* Panels that map to Contacto section subs */
/* Panels that map to Pagos section subs */
const PAGOS_PANELS: Partial<Record<PanelId, string>> = {
  "pago-movil": "pago_movil", zelle: "zelle", airtm: "airtm", binance: "binance", paypal: "paypal", "mercantil-pa": "mercantil_pa",
};

function ActivePanel({ id, onNavigate }: { id: PanelId; onNavigate: (p: PanelId) => void }) {
  if (id === "home")           return <BentoGrid onNavigate={onNavigate} />;
  if (id === "datos-personales") return <PersonalDataPanel />;
  if (id === "historial")        return <HistorialPanel />;
  if (id === "estado-cuenta")    return <BilleteraPanel />;
  if (id === "historial-proyectos")  return <HistorialProyectosPanel />;
  if (id === "estatus-proyectos")    return <EstatusProyectosPanel />;
  if (id === "proyectos-culminados") return <CulminadosPanel />;
  if (id === "contratacion")         return <ContratacionPanel />;
  if (id === "resenas")              return <ResenasPanel />;
  if (id === "consultoria")          return <ConsultoriaPanel />;
  if (id === "nuevo-proyecto")       return <NuevoProyectoPanel />;
  if (id in PAGOS_PANELS)           return <PagosPanel metodo={PAGOS_PANELS[id]!} />;
  if (id === "admin-clientes")      return <ClientesPanel />;
  if (id === "admin-correos")       return <CorreosPanel />;
  if (id === "admin-solicitudes")   return <SolicitudesPanel />;
  if (id === "admin-pagos")         return <PagosAdminPanel />;
  return <BentoGrid onNavigate={onNavigate} />;
}

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<PanelId>("home");

  // Back from the payment gateway → open the account statement to verify the top-up
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("recarga")) setActivePanel("estado-cuenta");
    // Deep link to a panel, e.g. /dashboard?panel=contratacion (the layout still enforces locks and roles)
    else if (sp.get("panel")) setActivePanel(sp.get("panel") as PanelId);
  }, []);

  return (
    <DashboardLayout activePanel={activePanel} onPanelChange={setActivePanel}>
      <ActivePanel id={activePanel} onNavigate={setActivePanel} />
    </DashboardLayout>
  );
}
