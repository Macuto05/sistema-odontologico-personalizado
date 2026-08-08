import { AntecedentePatologico } from "@/domain/entities/Paciente";

/**
 * Catálogo fijo de antecedentes personales patológicos (003-historia-clinica-paciente,
 * FR-002), en el orden del checklist en papel de referencia. "Otros" no está acá — es un
 * campo de texto libre aparte (`antecedentesPatologicosOtros`), no un valor de este enum.
 */
export const ANTECEDENTES_PATOLOGICOS_OPCIONES: { value: AntecedentePatologico; label: string }[] = [
  { value: "DIABETES", label: "Diabetes" },
  { value: "HEPATITIS", label: "Hepatitis" },
  { value: "ARTRITIS", label: "Artritis" },
  { value: "ASMA_EPOC", label: "Asma/EPOC" },
  { value: "ANEMIA", label: "Anemia" },
  { value: "INFARTO", label: "Infarto" },
  { value: "ENFERMEDADES_PULMONARES", label: "Enfermedades Pulmonares" },
  { value: "HIPERTIROIDISMO", label: "Hipertiroidismo" },
  { value: "HIPOTIROIDISMO", label: "Hipotiroidismo" },
  { value: "CONVULSIONES_DESMAYOS", label: "Convulsiones/Desmayos" },
  { value: "HIPERTENSION_HIPOTENSION", label: "Hipertensión/Hipotensión" },
  { value: "SINUSITIS", label: "Sinusitis" },
  { value: "ANGINA_PECHO", label: "Angina de Pecho" },
  { value: "FIEBRE_REUMATICA", label: "Fiebre Reumática" },
  { value: "GASTRITIS", label: "Gastritis" },
  { value: "ULCERA_GASTRICA", label: "Úlcera Gástrica" },
  { value: "ENFERMEDADES_TRANSMISION_SEXUAL", label: "Enfermedades de Transmisión Sexual" },
  { value: "ARTERIOSCLEROSIS", label: "Arteriosclerosis" },
  { value: "ALTERACIONES_METABOLICAS", label: "Alteraciones metabólicas" },
  { value: "ENFERMEDADES_ENDOCRINAS", label: "Enfermedades Endocrinas" },
  { value: "OSTEOPOROSIS", label: "Osteoporosis" },
];

export const ANTECEDENTE_PATOLOGICO_LABEL: Record<AntecedentePatologico, string> = Object.fromEntries(
  ANTECEDENTES_PATOLOGICOS_OPCIONES.map((o) => [o.value, o.label]),
) as Record<AntecedentePatologico, string>;
