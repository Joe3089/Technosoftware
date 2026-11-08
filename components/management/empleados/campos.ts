import type { Campo } from "@/components/management/Formulario";
import { ROLES_SISTEMA } from "@/lib/services/constantes";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";

/** asignaRol: admin o coordinador de Talento. El rol «Usuario» (clientes) nunca aparece aquí. */
export function camposEmpleado(esAdmin: boolean, asignaRol = esAdmin): Campo[] {
  return [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "texto" },
    { nombre: "email_corporativo", etiqueta: "Correo corporativo", tipo: "email", requerido: true },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto" },
    { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, requerido: true, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
    { nombre: "cargo_id", etiqueta: "Cargo", tipo: "ref", recurso: "cargos", refEtiqueta: (c) => String(c.nombre), refInicial: (f) => (f.cargo as { nombre?: string } | null)?.nombre },
    { nombre: "supervisor_id", etiqueta: "Supervisor", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.supervisor ? etqEmpleado(f.supervisor as Record<string, unknown>) : null) },
    ...(asignaRol ? [
      { nombre: "rol_sistema", etiqueta: "Rol", tipo: "opciones", requerido: true,
        opciones: ROLES_SISTEMA.filter((r) => esAdmin || r.valor !== "admin_general"),
        ayuda: "Administrador General es único y solo corresponde a la cuenta del administrador principal." } as Campo,
      { nombre: "es_coordinador", etiqueta: "Coordinador de su área", tipo: "bool" } as Campo,
    ] : []),
    { nombre: "fecha_ingreso", etiqueta: "Fecha de incorporación", tipo: "fecha" },
    { nombre: "tipo_contrato", etiqueta: "Tipo de contrato", tipo: "opciones", catalogo: "tipo_contrato" },
    ...(esAdmin ? [{ nombre: "estado", etiqueta: "Estado laboral", tipo: "opciones", opciones: [{ valor: "activo", etiqueta: "Activo" }, { valor: "inactivo", etiqueta: "Inactivo" }], requerido: true, soloEditar: true, ayuda: "Para desvincular usa el botón «Desvincular»." } as Campo] : []),
  ];
}
