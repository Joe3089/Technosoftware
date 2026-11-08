"use client";

import { useRouter } from "next/navigation";
import { useGestion } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import { Chip, fmtFecha } from "@/components/management/ui";
import { camposEmpleado } from "@/components/management/empleados/campos";
import { ESTADOS_EMPLEADO, ROLES_SISTEMA, color, etiqueta, etiquetaRol, nombreEmpleado } from "@/lib/services/constantes";

export default function PaginaEmpleados() {
  const { puede, esAdmin } = useGestion();
  const asignaRol = esAdmin || puede("empleados.asignar_rol");
  const router = useRouter();
  return (
    <div className="space-y-4">
      <h1 className="font-ui font-bold text-xl">Talento Humano</h1>
      <RecursoTabla recurso="empleados" campos={camposEmpleado(esAdmin, asignaRol)} textoNuevo="Nuevo empleado" puedeCrear={puede("empleados.gestionar")}
        nuevoInicial={{ rol_sistema: "devops", es_coordinador: false }} onAbrir={(f) => router.push(`/dashboard/empleados/${f.id}`)}
        filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_EMPLEADO }, { clave: "rol_sistema", etiqueta: "Rol", opciones: ROLES_SISTEMA }]}
        columnas={[
          { clave: "nombre", titulo: "Empleado", orden: "nombre", render: (f: Fila) => <span className="font-medium">{nombreEmpleado(f as unknown as { nombre: string; apellido: string })}</span> },
          { clave: "email_corporativo", titulo: "Correo" },
          { clave: "departamento", titulo: "Departamento", render: (f) => (f.departamento as { nombre: string } | null)?.nombre ?? "—" },
          { clave: "cargo", titulo: "Cargo", render: (f) => (f.cargo as { nombre: string } | null)?.nombre ?? "—" },
          { clave: "rol_sistema", titulo: "Rol", render: (f) => <Chip texto={etiquetaRol(f.rol_sistema as string, f.es_coordinador as boolean)} color={color(ROLES_SISTEMA, f.rol_sistema as string)} /> },
          { clave: "acceso", titulo: "Acceso", render: (f) => (f.profile_id ? <Chip texto="Con cuenta" color="#00cfff" /> : <Chip texto="Sin cuenta" color="#5c6b8a" />) },
          { clave: "estado", titulo: "Estado", orden: "estado", render: (f) => <Chip texto={etiqueta(ESTADOS_EMPLEADO, f.estado as string)} color={color(ESTADOS_EMPLEADO, f.estado as string)} /> },
          { clave: "fecha_ingreso", titulo: "Ingreso", orden: "fecha_ingreso", render: (f) => fmtFecha(f.fecha_ingreso as string) },
        ]} />
    </div>
  );
}
