import { z } from "zod";

/**
 * Operación de sync de Paciente — forma original (001-gestion-pacientes), solo renombra
 * `pacienteId` a `entidadId` genérico (004-consultorios, research.md #1).
 */
export const operacionSyncPacienteSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("PACIENTE"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "EDITAR", "ARCHIVAR", "REACTIVAR"]),
  payload: z.unknown(),
  baseVersion: z.number().int().positive(),
});

/**
 * Operación de sync de Consultorio (004-consultorios) — solo CREAR/ELIMINAR, sin
 * `baseVersion`: no hay edición, así que no hay conflicto de versión que detectar
 * (research.md #2).
 */
export const operacionSyncConsultorioSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("CONSULTORIO"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "ELIMINAR"]),
  payload: z.unknown(),
});

/**
 * Operación de sync de Cita (005-atencion-paciente, research.md #8) — tercera entidad
 * del outbox genérico. `baseVersion` es opcional a nivel de schema (CREAR no lo usa,
 * research.md #6) pero obligatorio en la práctica para EDITAR/FINALIZAR — se valida en
 * `aplicarOperacionCita`, no acá, mismo motivo que `estudioItemSchema.archivos` (mantener
 * el schema simple y la regla de negocio en la capa de aplicación).
 */
export const operacionSyncCitaSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("CITA"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "EDITAR", "FINALIZAR"]),
  payload: z.unknown(),
  baseVersion: z.number().int().positive().optional(),
});

/**
 * Operación de sync de Odontograma (006-odontograma, research.md #9) — `baseVersion`
 * opcional a nivel de schema por el mismo motivo que Cita (CREAR no lo usa); obligatorio en
 * la práctica para EDITAR, validado en `aplicarOperacionOdontograma`.
 */
export const operacionSyncOdontogramaSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("ODONTOGRAMA"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "EDITAR"]),
  payload: z.unknown(),
  baseVersion: z.number().int().positive().optional(),
});

/**
 * Operación de sync de CambioOdontograma (006-odontograma, research.md #4) — solo `CREAR`:
 * el schema mismo cierra la puerta a `EDITAR`/`ELIMINAR` (append-only), sin necesitar un
 * chequeo aparte en `aplicarOperacionCambioOdontograma` para ese caso.
 */
export const operacionSyncCambioOdontogramaSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("CAMBIO_ODONTOGRAMA"),
  entidadId: z.string().uuid(),
  tipo: z.literal("CREAR"),
  payload: z.unknown(),
});

/** Operación de sync de ItemPlanTratamiento (006-odontograma) — mismo mecanismo de
 * conflicto que Paciente. */
export const operacionSyncItemPlanTratamientoSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("ITEM_PLAN_TRATAMIENTO"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "EDITAR", "ELIMINAR"]),
  payload: z.unknown(),
  baseVersion: z.number().int().positive().optional(),
});

/**
 * Operación de sync de Insumo (010-gestion-insumos, research.md #2) — séptima entidad del
 * outbox genérico, sin cambios en su mecánica. Mismo juego de tipos y mismo mecanismo de
 * conflicto que Paciente; `baseVersion` obligatorio (CREAR también lo manda, con version 1).
 */
export const operacionSyncInsumoSchema = z.object({
  id: z.string().uuid(),
  entidad: z.literal("INSUMO"),
  entidadId: z.string().uuid(),
  tipo: z.enum(["CREAR", "EDITAR", "ARCHIVAR", "REACTIVAR"]),
  payload: z.unknown(),
  baseVersion: z.number().int().positive(),
});

export const operacionSyncSchema = z.discriminatedUnion("entidad", [
  operacionSyncPacienteSchema,
  operacionSyncConsultorioSchema,
  operacionSyncCitaSchema,
  operacionSyncOdontogramaSchema,
  operacionSyncCambioOdontogramaSchema,
  operacionSyncItemPlanTratamientoSchema,
  operacionSyncInsumoSchema,
]);

export const syncRequestSchema = z.object({
  operaciones: z.array(operacionSyncSchema).max(50),
});

export type OperacionSyncPaciente = z.infer<typeof operacionSyncPacienteSchema>;
export type OperacionSyncConsultorio = z.infer<typeof operacionSyncConsultorioSchema>;
export type OperacionSyncCita = z.infer<typeof operacionSyncCitaSchema>;
export type OperacionSyncOdontograma = z.infer<typeof operacionSyncOdontogramaSchema>;
export type OperacionSyncCambioOdontograma = z.infer<typeof operacionSyncCambioOdontogramaSchema>;
export type OperacionSyncItemPlanTratamiento = z.infer<
  typeof operacionSyncItemPlanTratamientoSchema
>;
export type OperacionSyncInsumo = z.infer<typeof operacionSyncInsumoSchema>;
export type OperacionSync = z.infer<typeof operacionSyncSchema>;
