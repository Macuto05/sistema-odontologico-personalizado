import { Consultorio, DatosNuevoConsultorio } from "../entities/Consultorio";

/**
 * Puerto de dominio (Principio II) — implementado por ConsultorioRepositoryPrisma
 * (servidor) y ConsultorioRepositoryDexie (cliente, local-first). Solo `crear` y
 * `eliminar` — no hay edición en esta feature (research.md #2), así que no existe
 * `version`/`conflictoPendiente` como en `IPacienteRepository`.
 */
export interface IConsultorioRepository {
  crear(datos: DatosNuevoConsultorio): Promise<Consultorio>;
  /** Orden alfabético por nombre. */
  listar(): Promise<Consultorio[]>;
  obtenerPorId(id: string): Promise<Consultorio | null>;
  /** Idempotente: eliminar un id que ya no existe no es un error (FR-004, research.md #2). */
  eliminar(id: string): Promise<void>;
}
