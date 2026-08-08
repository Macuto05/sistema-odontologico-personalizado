import { z } from "zod";

export const generoSchema = z.enum(["MASCULINO", "FEMENINO", "OTRO"]);

export const estadoCivilSchema = z.enum(["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_LIBRE"]);

/** Catálogo fijo de historia clínica (003-historia-clinica-paciente, FR-002). */
export const antecedentePatologicoSchema = z.enum([
  "DIABETES",
  "HEPATITIS",
  "ARTRITIS",
  "ASMA_EPOC",
  "ANEMIA",
  "INFARTO",
  "ENFERMEDADES_PULMONARES",
  "HIPERTIROIDISMO",
  "HIPOTIROIDISMO",
  "CONVULSIONES_DESMAYOS",
  "HIPERTENSION_HIPOTENSION",
  "SINUSITIS",
  "ANGINA_PECHO",
  "FIEBRE_REUMATICA",
  "GASTRITIS",
  "ULCERA_GASTRICA",
  "ENFERMEDADES_TRANSMISION_SEXUAL",
  "ARTERIOSCLEROSIS",
  "ALTERACIONES_METABOLICAS",
  "ENFERMEDADES_ENDOCRINAS",
  "OSTEOPOROSIS",
]);

/**
 * Etiquetas de historia clínica (revisión posterior, 008-rediseno-visual-sistema —
 * reemplaza el texto libre de una sola cadena): cada elemento recortado, se descartan las
 * etiquetas vacías. "Otros" marcado sin ninguna etiqueta cargada equivale a no marcado
 * (mismo criterio que antes con el string vacío, FR-004 de 003-historia-clinica-paciente).
 */
const etiquetasHistoriaClinicaSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((etiquetas) => etiquetas.map((e) => e.trim()).filter((e) => e !== ""));

/** 007-representante-menor: sentinel para "sin consultorio" en el filtro de búsqueda —
 * una query string no puede llevar `null` literal, así que se usa este valor y se traduce
 * a `null` en `buscarPacientesQuerySchema`. */
export const SIN_CONSULTORIO_FILTRO = "ninguno";

/**
 * Campos comunes a alta y edición de paciente. Objeto plano (no un `z.object` ya
 * construido) para poder aplicar `.refine()` en cada uno de los dos esquemas finales —
 * una vez que un `z.object` pasa por `.refine()` deja de exponer `.omit()`/`.extend()`,
 * así que ya no sirve como base para derivar el otro esquema (como se hacía antes).
 */
const camposComunesPaciente = {
  nombreCompleto: z.string().trim().min(1, "El nombre completo es obligatorio"),
  /** FR-001 de 007-representante-menor: ya no siempre obligatorio — ver refine más abajo.
   * `.transform` normaliza "ausente" a `null` — el dominio no distingue entre ambos, solo
   * Zod los ve distinto por el `.optional()` necesario para poder omitir el campo. */
  documentoIdentidad: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  fechaNacimiento: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  telefono: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email("Email inválido").nullable().optional(),
  direccion: z.string().trim().min(1).nullable().optional(),
  genero: generoSchema.nullable().optional(),
  estadoCivil: estadoCivilSchema.nullable().optional(),
  ocupacion: z.string().trim().min(1).nullable().optional(),
  antecedentesPatologicos: z.array(antecedentePatologicoSchema).optional().default([]),
  antecedentesPatologicosOtros: etiquetasHistoriaClinicaSchema,
  antecedentesHeredofamiliares: etiquetasHistoriaClinicaSchema,
  medicamentosActuales: etiquetasHistoriaClinicaSchema,
  alergias: etiquetasHistoriaClinicaSchema,
  /** 004-consultorios, FR-006/FR-009: opcional, `null`/ausente es "sin consultorio". */
  consultorioId: z.string().uuid().nullable().optional(),
  /** 007-representante-menor, FR-002: texto libre, nunca se valida contra otros pacientes. */
  representanteNombre: z.string().trim().min(1).nullable().optional(),
  representanteCedula: z.string().trim().min(1).nullable().optional(),
};

/** FR-001 de 007-representante-menor: el documento deja de ser obligatorio en bloque —
 * ahora alcanza con tener documento propio O un representante a cargo. */
function tieneDocumentoORepresentante(datos: {
  documentoIdentidad?: string | null;
  representanteNombre?: string | null;
}) {
  return Boolean(datos.documentoIdentidad) || Boolean(datos.representanteNombre);
}

const MENSAJE_DOCUMENTO_O_REPRESENTANTE =
  "El documento de identidad es obligatorio si el paciente no tiene representante";

/** FR-002: nombre y fecha de nacimiento obligatorios; documento condicional (ver refine). */
export const crearPacienteInputSchema = z
  .object({
    id: z.string().uuid(),
    ...camposComunesPaciente,
  })
  .refine(tieneDocumentoORepresentante, {
    message: MENSAJE_DOCUMENTO_O_REPRESENTANTE,
    path: ["documentoIdentidad"],
  });

export type CrearPacienteInput = z.infer<typeof crearPacienteInputSchema>;

export const editarPacienteInputSchema = z
  .object({
    ...camposComunesPaciente,
    baseVersion: z.number().int().positive(),
  })
  .refine(tieneDocumentoORepresentante, {
    message: MENSAJE_DOCUMENTO_O_REPRESENTANTE,
    path: ["documentoIdentidad"],
  });

export type EditarPacienteInput = z.infer<typeof editarPacienteInputSchema>;

export const buscarPacientesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  estado: z.enum(["ACTIVO", "ARCHIVADO", "TODOS"]).optional(),
  /** Base 1 — research.md #11. */
  pagina: z.coerce.number().int().positive().default(1),
  /** Tamaño de página fijo en 10 para la pantalla; el motor de sync pide lotes más grandes. */
  limite: z.coerce.number().int().positive().max(500).default(10),
  /** Timestamp ISO — pull incremental del motor de sync (research.md #12). */
  desde: z.string().datetime().optional(),
  /** Filtro "Filtros" del listado (007-representante-menor) — ambos inclusive. */
  edadMin: z.coerce.number().int().min(0).optional(),
  edadMax: z.coerce.number().int().min(0).optional(),
  /** Un id real, el sentinel `SIN_CONSULTORIO_FILTRO`, o ausente (no filtra). */
  consultorioId: z
    .string()
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === SIN_CONSULTORIO_FILTRO ? null : valor)),
});

export type BuscarPacientesQuery = z.infer<typeof buscarPacientesQuerySchema>;
