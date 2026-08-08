import { z } from "zod";

/** Catálogo fijo de tipo de consulta (FR-006, research.md #12). */
export const categoriaConsultaSchema = z.enum([
  "CONTROL",
  "URGENCIA",
  "LIMPIEZA_PROFILAXIS",
  "ENDODONCIA",
  "EXTRACCION",
  "RESTAURACION_OBTURACION",
  "ORTODONCIA",
  "CIRUGIA",
  "CONSULTA_GENERAL",
  "OTRO",
]);

/** FR-007: medicamento/dosis/frecuencia/duración obligatorios; indicaciones opcional. */
export const itemRecetaSchema = z.object({
  id: z.string().uuid(),
  medicamento: z.string().trim().min(1, "El medicamento es obligatorio"),
  dosis: z.string().trim().min(1, "La dosis es obligatoria"),
  frecuencia: z.string().trim().min(1, "La frecuencia es obligatoria"),
  duracion: z.string().trim().min(1, "La duración es obligatoria"),
  indicaciones: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

const archivoEstudioMetaSchema = z.object({
  id: z.string(),
  nombreArchivo: z.string(),
  tipo: z.enum(["IMAGEN", "PDF"]),
  createdAt: z.string(),
});

/** FR-009: nombre obligatorio. `archivos` es metadata derivada (research.md #3), nunca
 * se escribe directamente vía este schema — solo viaja de servidor a cliente. `motivo`
 * (indicación clínica del estudio) es opcional, agregado en el rediseño visual posterior. */
export const estudioItemSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, "El nombre del estudio es obligatorio"),
  motivo: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  archivos: z.array(archivoEstudioMetaSchema).optional().default([]),
});

export const crearCitaInputSchema = z.object({
  id: z.string().uuid(),
  pacienteId: z.string().uuid(),
});

export type CrearCitaInput = z.infer<typeof crearCitaInputSchema>;

const textoLibreCitaSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** FR-005, FR-006: ninguno de estos campos es obligatorio para guardar la cita en curso. */
export const editarCitaInputSchema = z.object({
  categoria: categoriaConsultaSchema.nullable().optional(),
  motivoConsulta: textoLibreCitaSchema,
  diagnostico: textoLibreCitaSchema,
  recetaItems: z.array(itemRecetaSchema).optional(),
  estudioItems: z.array(estudioItemSchema).optional(),
  baseVersion: z.number().int().positive(),
});

export type EditarCitaInput = z.infer<typeof editarCitaInputSchema>;
