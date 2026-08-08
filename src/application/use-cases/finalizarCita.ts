import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { ResultadoEdicionCita } from "@/domain/entities/Cita";

/**
 * Caso de uso: finalizar una atención (US6, FR-014 a FR-016). El repositorio decide
 * idempotencia (ya finalizada) y conflicto de versión — este caso de uso solo delega.
 */
export async function finalizarCita(
  repo: ICitaRepository,
  id: string,
  baseVersion: number,
): Promise<ResultadoEdicionCita> {
  return repo.finalizar(id, baseVersion);
}
