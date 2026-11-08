import type { Campo } from "../Formulario";
import { ROLES_INTERNOS } from "@/lib/gestion/constantes";
import { etqDepto, etqEmpleado } from "../actividades/comun";

export function camposEmpleado(esAdmin: boolean): Campo[] {
  return [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
    { nombre: "apellido", etiqueta: "Apellido", tipo: "texto" },
    { nombre: "email_corporativo", etiqueta: "Correo corporativo", tipo: "email", requerido: true },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto" },
    { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, requerido: true, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
    { nombre: "cargo_id", etiqueta: "Cargo", tipo: "ref", recurso: "cargos", refEtiqueta: (c) => String(c.nombre), refInicial: (f) => (f.cargo as { nombre?: string } | null)?.nombre },
    { nombre: "supervisor_id", etiqueta: "Supervisor", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.supervisor ? etqEmpleado(f.supervisor as Record<string, unknown>) : null) },
    ...(esAdmin ? [{ nombre: "rol_interno", etiqueta: "Rol interno", tipo: "opciones", opciones: ROLES_INTERNOS, requerido: true, ayuda: "Solo el administrador principal asigna roles." } as Campo] : []),
    { nombre: "fecha_ingreso", etiqueta: "Fecha de incorporación", tipo: "fecha" },
    { nombre: "tipo_contrato", etiqueta: "Tipo de contrato", tipo: "opciones", catalogo: "tipo_contrato" },
    ...(esAdmin ? [{ nombre: "estado", etiqueta: "Estado laboral", tipo: "opciones", opciones: [{ valor: "activo", etiqueta: "Activo" }, { valor: "inactivo", etiqueta: "Inactivo" }], requerido: true, soloEditar: true, ayuda: "Para desvincular usa el botón «Desvincular»." } as Campo] : []),
  ];
}
