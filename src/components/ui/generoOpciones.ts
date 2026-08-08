import { Genero } from "@/domain/entities/Paciente";

/** Opciones del campo Género, en el mismo orden en el que se muestran en el Select. */
export const GENERO_OPCIONES: { value: Genero; label: string }[] = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMENINO", label: "Femenino" },
  { value: "OTRO", label: "Otro" },
];

export const GENERO_LABEL: Record<Genero, string> = Object.fromEntries(
  GENERO_OPCIONES.map((o) => [o.value, o.label]),
) as Record<Genero, string>;
