import { CategoriaConsulta } from "@/domain/entities/Cita";

/**
 * Catálogo fijo de categoría de tipo de consulta (005-atencion-paciente, FR-006,
 * research.md #12) — propuesto ante la falta de un catálogo previo en el sistema, no
 * configurable por el odontólogo.
 */
export const CATEGORIA_CONSULTA_OPCIONES: { value: CategoriaConsulta; label: string }[] = [
  { value: "CONTROL", label: "Control" },
  { value: "URGENCIA", label: "Urgencia" },
  { value: "LIMPIEZA_PROFILAXIS", label: "Limpieza/Profilaxis" },
  { value: "ENDODONCIA", label: "Endodoncia" },
  { value: "EXTRACCION", label: "Extracción" },
  { value: "RESTAURACION_OBTURACION", label: "Restauración/Obturación" },
  { value: "ORTODONCIA", label: "Ortodoncia" },
  { value: "CIRUGIA", label: "Cirugía" },
  { value: "CONSULTA_GENERAL", label: "Consulta general" },
  { value: "OTRO", label: "Otro" },
];

export const CATEGORIA_CONSULTA_LABEL: Record<CategoriaConsulta, string> = Object.fromEntries(
  CATEGORIA_CONSULTA_OPCIONES.map((o) => [o.value, o.label]),
) as Record<CategoriaConsulta, string>;
