import {
  IInsumoRepository,
  ResultadoArchivadoInsumo,
} from "@/domain/repositories/IInsumoRepository";

/**
 * Caso de uso: archivar (baja lógica) un insumo (US5, FR-013). Idempotente si ya estaba
 * archivado — informa el estado, no falla (spec §Edge Cases).
 */
export async function archivarInsumo(
  repo: IInsumoRepository,
  id: string,
): Promise<ResultadoArchivadoInsumo> {
  return repo.archivar(id);
}
