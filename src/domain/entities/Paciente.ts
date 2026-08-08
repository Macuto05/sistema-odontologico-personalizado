/**
 * Entidad de dominio Paciente. Sin dependencias de framework (Principio II).
 * Ver specs/001-gestion-pacientes/data-model.md para la definición completa.
 */

export type EstadoPaciente = "ACTIVO" | "ARCHIVADO";

export type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

export type EstadoCivil = "SOLTERO" | "CASADO" | "DIVORCIADO" | "VIUDO" | "UNION_LIBRE";

/** Catálogo fijo de historia clínica (003-historia-clinica-paciente, FR-002). */
export type AntecedentePatologico =
  | "DIABETES"
  | "HEPATITIS"
  | "ARTRITIS"
  | "ASMA_EPOC"
  | "ANEMIA"
  | "INFARTO"
  | "ENFERMEDADES_PULMONARES"
  | "HIPERTIROIDISMO"
  | "HIPOTIROIDISMO"
  | "CONVULSIONES_DESMAYOS"
  | "HIPERTENSION_HIPOTENSION"
  | "SINUSITIS"
  | "ANGINA_PECHO"
  | "FIEBRE_REUMATICA"
  | "GASTRITIS"
  | "ULCERA_GASTRICA"
  | "ENFERMEDADES_TRANSMISION_SEXUAL"
  | "ARTERIOSCLEROSIS"
  | "ALTERACIONES_METABOLICAS"
  | "ENFERMEDADES_ENDOCRINAS"
  | "OSTEOPOROSIS";

export interface ConflictoPendiente {
  versionServidor: unknown;
  versionDispositivo: unknown;
  detectadoEn: string;
}

export interface Paciente {
  id: string;
  nombreCompleto: string;
  /**
   * `null` cuando el paciente es representado por un adulto y todavía no tiene documento
   * propio (007-representante-menor, FR-001) — nunca obligatorio si hay `representanteNombre`.
   */
  documentoIdentidad: string | null;
  /** ISO 8601 (YYYY-MM-DD) */
  fechaNacimiento: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  genero: Genero | null;
  estadoCivil: EstadoCivil | null;
  ocupacion: string | null;
  /**
   * Datos del adulto que representa al paciente (007-representante-menor, FR-002) — texto
   * libre, nunca se valida contra `documentoIdentidad` de otros pacientes: si el
   * representante también es paciente, su propia ficha usa su propio `documentoIdentidad`,
   * son conceptos independientes.
   */
  representanteNombre: string | null;
  representanteCedula: string | null;
  /** Historia clínica (003-historia-clinica-paciente, FR-002 a FR-008). */
  antecedentesPatologicos: AntecedentePatologico[];
  /**
   * Etiquetas independientes en vez de texto libre (revisión posterior,
   * 008-rediseno-visual-sistema) — "Otros" marcado sin ninguna etiqueta equivale a no
   * marcado, mismo criterio que antes con el string vacío.
   */
  antecedentesPatologicosOtros: string[];
  antecedentesHeredofamiliares: string[];
  medicamentosActuales: string[];
  alergias: string[];
  estado: EstadoPaciente;
  version: number;
  conflictoPendiente: ConflictoPendiente | null;
  /** Consultorio asignado (004-consultorios, FR-006/FR-007) — `null` es "sin consultorio". */
  consultorioId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatosNuevoPaciente {
  id: string;
  nombreCompleto: string;
  documentoIdentidad: string | null;
  fechaNacimiento: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  genero?: Genero | null;
  estadoCivil?: EstadoCivil | null;
  ocupacion?: string | null;
  antecedentesPatologicos?: AntecedentePatologico[];
  antecedentesPatologicosOtros?: string[];
  antecedentesHeredofamiliares?: string[];
  medicamentosActuales?: string[];
  alergias?: string[];
  consultorioId?: string | null;
  representanteNombre?: string | null;
  representanteCedula?: string | null;
}

/** Construye un Paciente nuevo en estado ACTIVO, version 1 — sin persistirlo. */
export function crearPacienteDesdeDatos(datos: DatosNuevoPaciente): Paciente {
  const ahora = new Date().toISOString();
  return {
    id: datos.id,
    nombreCompleto: datos.nombreCompleto,
    documentoIdentidad: datos.documentoIdentidad,
    fechaNacimiento: datos.fechaNacimiento,
    telefono: datos.telefono ?? null,
    email: datos.email ?? null,
    direccion: datos.direccion ?? null,
    genero: datos.genero ?? null,
    estadoCivil: datos.estadoCivil ?? null,
    ocupacion: datos.ocupacion ?? null,
    antecedentesPatologicos: datos.antecedentesPatologicos ?? [],
    antecedentesPatologicosOtros: datos.antecedentesPatologicosOtros ?? [],
    antecedentesHeredofamiliares: datos.antecedentesHeredofamiliares ?? [],
    medicamentosActuales: datos.medicamentosActuales ?? [],
    alergias: datos.alergias ?? [],
    estado: "ACTIVO",
    version: 1,
    conflictoPendiente: null,
    consultorioId: datos.consultorioId ?? null,
    representanteNombre: datos.representanteNombre ?? null,
    representanteCedula: datos.representanteCedula ?? null,
    createdAt: ahora,
    updatedAt: ahora,
  };
}

/** FR-008: un paciente archivado no admite edición directa de sus campos. */
export function puedeEditarse(paciente: Paciente): boolean {
  return paciente.estado === "ACTIVO";
}
