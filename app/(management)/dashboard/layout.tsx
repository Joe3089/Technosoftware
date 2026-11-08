import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/permissions";
import { ProveedorGestion } from "@/components/management/contexto";
import Shell from "@/components/management/Shell";

export const metadata: Metadata = { title: "Gestión · Technosoftware", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Área privada del equipo interno. El acceso se decide en el servidor (empleado activo o admin principal);
// las API y RLS vuelven a validar cada operación.
export default async function GestionLayout({ children }: { children: React.ReactNode }) {
  const r = await obtenerContexto();
  if (!r) redirect("/login");
  if (!r.ctx?.staff) redirect("/dashboard");
  return (
    <ProveedorGestion>
      <Shell>{children}</Shell>
    </ProveedorGestion>
  );
}
