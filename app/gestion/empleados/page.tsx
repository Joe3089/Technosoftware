"use client";

import { useRouter } from "next/navigation";
import { useGestion } from "@/components/gestion/contexto";
import { RecursoTabla, type Fila } from "@/components/gestion/RecursoTabla";
import { Chip, fmtFecha } from "@/components/gestion/ui";
import { camposEmpleado } from "@/components/gestion/empleados/campos";
import { ESTADOS_EMPLEADO, ROLES_INTERNOS, color, etiqueta, nombreEmpleado } from "@/lib/gestion/constantes";

export default function PaginaEmpleados() {
  const { puede, esAdmin } = useGestion();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <h1 className="font-ui font-bold text-xl">Talento Humano</h1>
      <RecursoTabla recurso="empleados" campos={camposEmpleado(esAdmin)} textoNuevo="Nuevo empleado" puedeCrear={puede("empleados.gestionar")}
        nuevoInicial={{ rol_interno: "empleado" }} onAbrir={(f) => router.push(`/gestion/empleados/${f.id}`)}
        filtros={[{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_EMPLEADO }, { clave: "rol_interno", etiqueta: "Rol", opciones: ROLES_INTERNOS }]}
        columnas={[
          { clave: "nombre", titulo: "Empleado", orden: "nombre", render: (f: Fila) => <span className="font-medium">{nombreEmpleado(f as unknown as { nombre: string; apellido: string })}</span> },
          { clave: "email_corporativo", titulo: "Correo" },
          { clave: "departamento", titulo: "Departamento", render: (f) => (f.departamento as { nombre: string } | null)?.nombre ?? "—" },
          { clave: "cargo", titulo: "Cargo", render: (f) => (f.cargo as { nombre: string } | null)?.nombre ?? "—" },
          { clave: "rol_interno", titulo: "Rol", render: (f) => etiqueta(ROLES_INTERNOS, f.rol_interno as string) },
          { clave: "acceso", titulo: "Acceso", render: (f) => (f.profile_id ? <Chip texto="Con cuenta" color="#00cfff" /> : <Chip texto="Sin cuenta" color="#5c6b8a" />) },
          { clave: "estado", titulo: "Estado", orden: "estado", render: (f) => <Chip texto={etiqueta(ESTADOS_EMPLEADO, f.estado as string)} color={color(ESTADOS_EMPLEADO, f.estado as string)} /> },
          { clave: "fecha_ingreso", titulo: "Ingreso", orden: "fecha_ingreso", render: (f) => fmtFecha(f.fecha_ingreso as string) },
        ]} />
    </div>
  );
}
