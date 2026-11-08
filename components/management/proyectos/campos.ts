import type { Campo } from "@/components/management/Formulario";
import { ESTADOS_PROYECTO, ETAPAS_PROYECTO, MONEDAS, PRIORIDADES } from "@/lib/services/constantes";
import { etqDepto, etqEmpleado } from "@/components/planning/comun";

export const etqCliente = (f: Record<string, unknown>) => `${f.nombre ?? ""}${f.empresa ? ` · ${f.empresa}` : ""}`;

export const CAMPOS_PROYECTO: Campo[] = [
  { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true, completo: true },
  { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
  { nombre: "cliente_id", etiqueta: "Cliente", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, refInicial: (f) => (f.cliente ? etqCliente(f.cliente as Record<string, unknown>) : null) },
  { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
  { nombre: "coordinador_id", etiqueta: "Coordinador", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.coordinador ? etqEmpleado(f.coordinador as Record<string, unknown>) : null) },
  { nombre: "prioridad", etiqueta: "Prioridad", tipo: "opciones", opciones: PRIORIDADES, requerido: true },
  { nombre: "etapa", etiqueta: "Fase", tipo: "opciones", opciones: ETAPAS_PROYECTO, requerido: true },
  { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: ESTADOS_PROYECTO, requerido: true, soloEditar: true },
  { nombre: "presupuesto", etiqueta: "Presupuesto", tipo: "numero", min: 0 },
  { nombre: "moneda", etiqueta: "Moneda", tipo: "opciones", opciones: MONEDAS, requerido: true },
  { nombre: "inicio_plan", etiqueta: "Inicio planificado", tipo: "fecha" },
  { nombre: "fin_plan", etiqueta: "Fin planificado", tipo: "fecha" },
  { nombre: "avance", etiqueta: "Avance (%)", tipo: "numero", min: 0, max: 100, soloEditar: true },
];
