import { z } from "zod";

/**
 * DTOs de Insumo (010-gestion-insumos) — validación en el límite de dominio/caso de uso,
 * no solo en la UI (Principio III). Ver contracts/insumos-api.md.
 */

/**
 * FR-003: entero >= 0. `z.coerce` no se usa acá a propósito — la UI ya convierte el input
 * a número; aceptar strings silenciosamente escondería un bug de tipos del llamador.
 */
const stockSchema = z
  .number({ invalid_type_error: "El stock debe ser un número" })
  .int("El stock debe ser un número entero")
  .min(0, "El stock no puede ser negativo");

/** Campos comunes a alta y edición. Objeto plano para poder derivar ambos esquemas. */
const camposComunesInsumo = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  /** FR-002: opcional. Texto libre, sin catálogo (research.md #5). */
  categoria: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  stockActual: stockSchema,
  stockMinimo: stockSchema,
};

/** FR-001, FR-002: nombre y ambos stocks obligatorios; categoría opcional. */
export const crearInsumoInputSchema = z.object({
  id: z.string().uuid(),
  ...camposComunesInsumo,
});

export type CrearInsumoInput = z.infer<typeof crearInsumoInputSchema>;

export const editarInsumoInputSchema = z.object({
  ...camposComunesInsumo,
  baseVersion: z.number().int().positive(),
});

export type EditarInsumoInput = z.infer<typeof editarInsumoInputSchema>;

export const buscarInsumosQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  categoria: z.string().trim().min(1).optional(),
  /** Llega como string desde la query (`?aReponer=true`) o como boolean desde la UI. */
  aReponer: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (typeof v === "string" ? v === "true" : v)),
  estado: z.enum(["ACTIVO", "ARCHIVADO", "TODOS"]).optional(),
  /** Base 1 — FR-007. */
  pagina: z.coerce.number().int().positive().default(1),
  /** Tamaño de página fijo en 10 para la pantalla; el motor de sync pide lotes más grandes. */
  limite: z.coerce.number().int().positive().max(500).default(10),
  /** Timestamp ISO — pull incremental del motor de sync. */
  desde: z.string().datetime().optional(),
});

export type BuscarInsumosQuery = z.infer<typeof buscarInsumosQuerySchema>;
