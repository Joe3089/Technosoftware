import { redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Área del cliente (rol «usuario»). El personal interno trabaja en /dashboard/<módulo> y nunca ve
// esta área; el administrador principal conserva acceso porque aquí verifica pagos y solicitudes.
export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const r = await obtenerContexto();
  if (r?.ctx?.staff && r.ctx.rol !== "admin") redirect("/dashboard/inicio");
  return children;
}
