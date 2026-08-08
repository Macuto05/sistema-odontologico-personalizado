import { IInsumoRepository } from "@/domain/repositories/IInsumoRepository";
import { Insumo } from "@/domain/entities/Insumo";

/** Caso de uso: reactivar un insumo archivado (US5, FR-014). */
export async function reactivarInsumo(repo: IInsumoRepository, id: string): Promise<Insumo> {
  return repo.reactivar(id);
}
