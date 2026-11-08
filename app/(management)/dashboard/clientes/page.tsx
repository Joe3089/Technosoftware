import { redirect } from "next/navigation";

// Clientes vive ahora dentro de CRM
export default function Clientes() {
  redirect("/dashboard/crm?tab=clientes");
}
