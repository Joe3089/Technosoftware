import type { Campo } from "../Formulario";
import { ESTADOS_TAREA, PRIORIDADES, nombreEmpleado } from "@/lib/gestion/constantes";

export interface Tarea {
  id: string; titulo: string; descripcion: string | null; proyecto_id: string | null; departamento_id: string | null;
  responsable_id: string | null; padre_id: string | null; prioridad: string; estado: string;
  inicio: string | null; fin: string | null; duracion_estimada: number | null; tiempo_real: number; progreso: number;
  es_hito: boolean; orden: number; creado_por: string | null; completada_at: string | null; created_at: string;
  responsable: { id: string; nombre: string; apellido: string } | null;
  departamento: { id: string; nombre: string; codigo: string } | null;
  proyecto: { id: string; codigo: string; nombre: string } | null;
}

export type Actualizar = (id: string, cambios: Partial<Tarea>) => Promise<boolean>;

export const CERRADAS = ["completada", "cancelada"];
export const vencida = (t: Tarea, hoy: string) => !!t.fin && t.fin < hoy && !CERRADAS.includes(t.estado);

export const etqEmpleado = (f: Record<string, unknown>) => nombreEmpleado(f as { nombre: string; apellido: string });
export const etqProyecto = (f: Record<string, unknown>) => `${f.codigo ?? ""} · ${f.nombre ?? ""}`;
export const etqDepto = (f: Record<string, unknown>) => String(f.nombre ?? "");

export const CAMPOS_TAREA: Campo[] = [
  { nombre: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, completo: true },
  { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
  { nombre: "proyecto_id", etiqueta: "Proyecto", tipo: "ref", recurso: "proyectos", refEtiqueta: etqProyecto, refInicial: (f) => (f.proyecto ? etqProyecto(f.proyecto as Record<string, unknown>) : null) },
  { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, refInicial: (f) => (f.departamento as { nombre?: string } | null)?.nombre },
  { nombre: "responsable_id", etiqueta: "Responsable", tipo: "ref", recurso: "empleados", refEtiqueta: etqEmpleado, refFiltros: { estado: "activo" }, refInicial: (f) => (f.responsable ? etqEmpleado(f.responsable as Record<string, unknown>) : null) },
  { nombre: "prioridad", etiqueta: "Prioridad", tipo: "opciones", opciones: PRIORIDADES, requerido: true },
  { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: ESTADOS_TAREA, requerido: true },
  { nombre: "inicio", etiqueta: "Inicio", tipo: "fecha" },
  { nombre: "fin", etiqueta: "Finalización", tipo: "fecha" },
  { nombre: "duracion_estimada", etiqueta: "Duración estimada (h)", tipo: "numero", min: 0 },
  { nombre: "tiempo_real", etiqueta: "Tiempo real (h)", tipo: "numero", min: 0, soloEditar: true },
  { nombre: "progreso", etiqueta: "Progreso (%)", tipo: "numero", min: 0, max: 100 },
  { nombre: "es_hito", etiqueta: "Es un hito", tipo: "bool" },
];
