import { EstadoCivil } from "@/domain/entities/Paciente";

/** Opciones del campo Estado civil, en el mismo orden en el que se muestran en el Select. */
export const ESTADO_CIVIL_OPCIONES: { value: EstadoCivil; label: string }[] = [
  { value: "SOLTERO", label: "Soltero/a" },
  { value: "CASADO", label: "Casado/a" },
  { value: "DIVORCIADO", label: "Divorciado/a" },
  { value: "VIUDO", label: "Viudo/a" },
  { value: "UNION_LIBRE", label: "Unión libre" },
];

export const ESTADO_CIVIL_LABEL: Record<EstadoCivil, string> = Object.fromEntries(
  ESTADO_CIVIL_OPCIONES.map((o) => [o.value, o.label]),
) as Record<EstadoCivil, string>;
