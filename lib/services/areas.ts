// Documentos de cada área (tabla documentos_area, migración 014). «coord» = solo la coordinación del área.
// Los campos «d_*» se guardan en documentos_area.datos.
import type { Opcion } from "./constantes";

type CampoDoc = { nombre: string; etiqueta: string; tipo: "texto" | "textarea" | "numero" | "fecha" | "opciones"; opciones?: Opcion[]; requerido?: boolean };
export interface TipoDoc {
  etiqueta: string; area: string; coord?: boolean; descripcion: string;
  estados: string[]; proyecto?: "requerido" | "opcional"; cliente?: boolean; fecha?: string; responsable?: string; campos?: CampoDoc[];
}
const o = (valor: string, etiqueta: string): Opcion => ({ valor, etiqueta });

export const ESTADOS_DOC: Opcion[] = [
  { valor: "borrador", etiqueta: "Borrador", color: "#9aafd4" }, { valor: "en_revision", etiqueta: "En revisión", color: "#b388ff" },
  { valor: "aprobado", etiqueta: "Aprobado / verificado", color: "#00e676" }, { valor: "publicado", etiqueta: "Publicado", color: "#00cfff" },
  { valor: "rechazado", etiqueta: "Rechazado", color: "#ff5370" }, { valor: "programado", etiqueta: "Programado", color: "#4d7fff" },
  { valor: "realizado", etiqueta: "Realizado", color: "#ffb300" }, { valor: "cumple", etiqueta: "Cumple", color: "#00e676" },
  { valor: "en_proceso", etiqueta: "En proceso", color: "#ffb300" }, { valor: "incumple", etiqueta: "Incumple", color: "#ff5370" },
  { valor: "presentado", etiqueta: "Presentado al cliente", color: "#4d7fff" }, { valor: "firmado", etiqueta: "Firmado", color: "#00e676" },
];

export const AREAS: Record<string, { nombre: string; descripcion: string }> = {
  comercializacion: { nombre: "Comercialización", descripcion: "Métricas del departamento, estrategias, estudios de mercado y reportes." },
  finanzas: { nombre: "Finanzas", descripcion: "La coordinación verifica cuentas y movimientos; el equipo verifica pagos para que la IA los concilie (Contabilidad → Verificación de pagos)." },
  talento: { nombre: "Talento", descripcion: "Entrevistas, bienestar y antiestrés, contenido de valor y análisis de candidatos." },
  devops: { nombre: "DevOps", descripcion: "Definición técnica con arquitectura y líderes de front y back; asignación de programadores en proyectos contratados." },
  consultoria: { nombre: "Consultoría", descripcion: "Seguimiento de proyectos, tareas para programadores, documentación y reportes (QA, programador, proyecto y departamento)." },
  legal: { nombre: "Legal", descripcion: "Redacción y carga de contratos para las empresas y cumplimiento normativo de la operación." },
};

export const TIPOS_DOC: Record<string, TipoDoc> = {
  estrategia: { etiqueta: "Estrategias", area: "comercializacion", coord: true, descripcion: "Estrategias comerciales y de marketing.", estados: ["borrador", "en_revision", "aprobado"],
    campos: [{ nombre: "d_objetivo", etiqueta: "Objetivo", tipo: "texto", requerido: true }, { nombre: "d_publico", etiqueta: "Público objetivo", tipo: "texto" },
      { nombre: "d_canales", etiqueta: "Canales", tipo: "texto" }, { nombre: "d_periodo", etiqueta: "Período", tipo: "texto" }] },
  estudio_mercado: { etiqueta: "Estudios de mercado", area: "comercializacion", coord: true, descripcion: "Investigación de mercado y competencia.", estados: ["borrador", "en_revision", "aprobado"],
    campos: [{ nombre: "d_mercado", etiqueta: "Mercado / segmento", tipo: "texto", requerido: true }, { nombre: "d_metodologia", etiqueta: "Metodología", tipo: "texto" }] },
  reporte: { etiqueta: "Reportes", area: "comercializacion", coord: true, descripcion: "Reportes comerciales del departamento.", estados: ["borrador", "aprobado"],
    campos: [{ nombre: "d_periodo", etiqueta: "Período", tipo: "texto", requerido: true }] },

  candidato: { etiqueta: "Análisis de candidatos", area: "talento", descripcion: "Perfil de los posibles empleados antes de la entrevista.", estados: ["en_revision", "aprobado", "rechazado"], responsable: "Analista",
    campos: [{ nombre: "d_puesto", etiqueta: "Puesto", tipo: "texto", requerido: true }, { nombre: "d_perfil", etiqueta: "Perfil / CV (enlace)", tipo: "texto" },
      { nombre: "d_puntaje", etiqueta: "Puntaje (0-10)", tipo: "numero" },
      { nombre: "d_recomendacion", etiqueta: "Recomendación", tipo: "opciones", opciones: [o("avanzar", "Avanzar a entrevista"), o("reserva", "En reserva"), o("descartar", "Descartar")] }] },
  entrevista: { etiqueta: "Entrevistas", area: "talento", coord: true, descripcion: "Programación y verificación de entrevistas.", estados: ["programado", "realizado", "aprobado", "rechazado"], fecha: "Fecha y hora", responsable: "Entrevistador",
    campos: [{ nombre: "d_candidato", etiqueta: "Candidato", tipo: "texto", requerido: true }, { nombre: "d_puesto", etiqueta: "Puesto", tipo: "texto" }] },
  bienestar: { etiqueta: "Bienestar y antiestrés", area: "talento", coord: true, descripcion: "Actividades de distracción y antiestrés. Al publicarlas las ve todo el personal.", estados: ["borrador", "publicado", "realizado"], fecha: "Fecha y hora",
    campos: [{ nombre: "d_lugar", etiqueta: "Lugar / enlace", tipo: "texto" }, { nombre: "d_actividad", etiqueta: "Tipo de actividad", tipo: "texto" }] },
  contenido: { etiqueta: "Contenido de valor", area: "talento", descripcion: "Contenido para el personal y las redes. La coordinación lo publica.", estados: ["borrador", "en_revision", "publicado"],
    campos: [{ nombre: "d_canal", etiqueta: "Canal", tipo: "opciones", opciones: [o("interno", "Interno (personal)"), o("redes", "Redes sociales")], requerido: true },
      { nombre: "d_red", etiqueta: "Red social", tipo: "texto" }] },

  definicion_tecnica: { etiqueta: "Definición técnica", area: "devops", coord: true, proyecto: "requerido", descripcion: "Reunión con arquitecto y líderes de front y back: tecnologías y tipo de desarrollo de la personalización.",
    estados: ["borrador", "aprobado"], fecha: "Fecha de la reunión",
    campos: [{ nombre: "d_arquitecto", etiqueta: "Arquitecto", tipo: "texto" }, { nombre: "d_lider_front", etiqueta: "Líder de front", tipo: "texto" },
      { nombre: "d_lider_back", etiqueta: "Líder de back", tipo: "texto" }, { nombre: "d_tecnologias", etiqueta: "Tecnologías", tipo: "texto", requerido: true },
      { nombre: "d_tipo_desarrollo", etiqueta: "Tipo de desarrollo", tipo: "texto" }] },

  seguimiento: { etiqueta: "Seguimientos", area: "consultoria", proyecto: "requerido", descripcion: "Seguimiento del proyecto asignado.", estados: ["borrador", "en_revision", "aprobado"], fecha: "Fecha" },
  reporte_proyecto: { etiqueta: "Reportes de proyecto", area: "consultoria", proyecto: "requerido", descripcion: "Reporte del avance del proyecto.", estados: ["borrador", "en_revision", "aprobado"],
    campos: [{ nombre: "d_periodo", etiqueta: "Período", tipo: "texto" }] },
  documentacion: { etiqueta: "Documentación", area: "consultoria", proyecto: "requerido", descripcion: "Documentación de lo realizado.", estados: ["borrador", "en_revision", "aprobado"] },
  reporte_qa: { etiqueta: "Reportes de QA", area: "consultoria", proyecto: "requerido", descripcion: "Resultado de las pruebas de QA.", estados: ["borrador", "en_revision", "aprobado"], responsable: "QA",
    campos: [{ nombre: "d_resultado", etiqueta: "Resultado", tipo: "opciones", opciones: [o("aprobado", "Aprobado"), o("incidencias", "Con incidencias"), o("rechazado", "Rechazado")], requerido: true },
      { nombre: "d_casos", etiqueta: "Casos probados", tipo: "numero" }] },
  reporte_programador: { etiqueta: "Reportes de programador", area: "consultoria", proyecto: "requerido", descripcion: "Reporte de pruebas y entregas del programador.", estados: ["borrador", "en_revision", "aprobado"], responsable: "Programador" },
  reporte_departamento: { etiqueta: "Reporte general", area: "consultoria", coord: true, descripcion: "Reporte general del departamento (project manager).", estados: ["borrador", "aprobado"],
    campos: [{ nombre: "d_periodo", etiqueta: "Período", tipo: "texto", requerido: true }] },

  contrato: { etiqueta: "Contratos", area: "legal", proyecto: "opcional", cliente: true, descripcion: "Contratos que se presentan a las empresas (adjunta el documento).", estados: ["borrador", "en_revision", "aprobado", "presentado", "firmado"], fecha: "Fecha de presentación",
    campos: [{ nombre: "d_monto", etiqueta: "Monto", tipo: "numero" }, { nombre: "d_vigencia", etiqueta: "Vigencia", tipo: "texto" }] },
  normativa: { etiqueta: "Cumplimiento normativo", area: "legal", descripcion: "Normativas legales que la empresa debe cumplir para operar.", estados: ["cumple", "en_proceso", "incumple"], fecha: "Próxima revisión",
    campos: [{ nombre: "d_organismo", etiqueta: "Organismo", tipo: "texto", requerido: true }, { nombre: "d_norma", etiqueta: "Norma / requisito", tipo: "texto", requerido: true }] },
};

export const tiposDeArea = (area: string) => Object.entries(TIPOS_DOC).filter(([, t]) => t.area === area);
