import { z } from "zod";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";

export const superficieSchema = z.enum([
  "MESIAL",
  "DISTAL",
  "VESTIBULAR",
  "PALATINO_LINGUAL",
  "OCLUSAL_INCISAL",
]);

export const estadoColorSchema = z.enum(["PENDIENTE", "REALIZADO"]);

const textoLibreOpcionalSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/**
 * FR-003 a FR-007, FR-013 a FR-015: valida un hallazgo contra las reglas de su condición en
 * el catálogo estático (data-model.md §Validaciones). No valida `exclusivoNino` contra la
 * dentición del Odontograma — eso requiere contexto externo (a qué Odontograma pertenece)
 * y se valida en el caso de uso `registrarHallazgo`.
 */
export const hallazgoInputSchema = z
  .object({
    id: z.string().uuid(),
    condicionId: z.string(),
    dientes: z.array(z.string().trim().min(1)).min(1, "Debe indicar al menos un diente"),
    superficie: superficieSchema.nullable().optional().default(null),
    variante: z.string().nullable().optional().default(null),
    estadoColor: estadoColorSchema.nullable().optional().default(null),
    nota: textoLibreOpcionalSchema,
    registradoEn: z.string(),
  })
  .superRefine((datos, ctx) => {
    const condicion = buscarCondicion(datos.condicionId);
    if (!condicion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Condición desconocida: ${datos.condicionId}`,
        path: ["condicionId"],
      });
      return;
    }
    if (condicion.aplicaA === "DIENTE" && datos.superficie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${condicion.nombre} aplica a diente completo, no admite superficie`,
        path: ["superficie"],
      });
    }
    if (condicion.aplicaA === "SUPERFICIE" && !datos.superficie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${condicion.nombre} requiere indicar una superficie`,
        path: ["superficie"],
      });
    }
    if (!condicion.multiDiente && datos.dientes.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${condicion.nombre} no admite más de un diente`,
        path: ["dientes"],
      });
    }
    if (condicion.variantes) {
      if (!datos.variante || !condicion.variantes.includes(datos.variante)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${condicion.nombre} requiere una variante válida: ${condicion.variantes.join(", ")}`,
          path: ["variante"],
        });
      }
    } else if (datos.variante) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${condicion.nombre} no admite variante`,
        path: ["variante"],
      });
    }
    if (!condicion.admiteEstadoColor && datos.estadoColor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${condicion.nombre} no admite estado pendiente/realizado`,
        path: ["estadoColor"],
      });
    }
  });

export type HallazgoInput = z.infer<typeof hallazgoInputSchema>;

/** Nota libre por contexto de selección (diente, superficie) — a diferencia de
 * `hallazgoInputSchema`, no depende del catálogo de condiciones (no hay `condicionId`). */
export const notaDentalInputSchema = z.object({
  id: z.string().uuid(),
  diente: z.string().trim().min(1),
  superficie: superficieSchema.nullable().optional().default(null),
  texto: z.string(),
  registradoEn: z.string(),
});

export type NotaDentalInput = z.infer<typeof notaDentalInputSchema>;

export const itemPlanTratamientoInputSchema = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria"),
  diente: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  tratamiento: z.string().trim().min(1, "El tratamiento es obligatorio"),
});

export type ItemPlanTratamientoInput = z.infer<typeof itemPlanTratamientoInputSchema>;

/** `fechaRealizado`/`nota` (009-planes-tratamiento) — únicos dos campos que la pestaña
 * "Planes" puede enviar; `.partial()` ya deja fecha/diente/tratamiento opcionales, así que
 * un payload angosto como `{ fechaRealizado, baseVersion }` (sin los demás) valida bien acá.
 * La frontera real que impide que Planes toque fecha/diente/tratamiento es de aplicación —
 * `marcarRealizadoItemPlanTratamiento`/`editarNotaItemPlanTratamiento` no aceptan esos
 * campos por firma (data-model.md de 009-planes-tratamiento) — este schema es
 * deliberadamente permisivo porque ya confía en la mutación local previamente validada,
 * mismo criterio que el resto del patrón outbox del proyecto.
 */
export const editarItemPlanTratamientoInputSchema = itemPlanTratamientoInputSchema
  .partial()
  .extend({
    fechaRealizado: z.string().trim().min(1).nullable().optional(),
    nota: z.string().nullable().optional(),
    baseVersion: z.number().int().positive(),
  });

export type EditarItemPlanTratamientoInput = z.infer<typeof editarItemPlanTratamientoInputSchema>;
