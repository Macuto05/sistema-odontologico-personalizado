import { IInsumoRepository } from "@/domain/repositories/IInsumoRepository";
import { Insumo } from "@/domain/entities/Insumo";
import { crearInsumoInputSchema } from "../dto/insumoDto";

/**
 * Caso de uso: alta de insumo (US1, FR-001 a FR-003).
 * Valida con Zod (Principio III) y delega en el repositorio, que puede ser
 * InsumoRepositoryPrisma (servidor) o InsumoRepositoryDexie (cliente, local-first) — este
 * caso de uso no sabe ni le importa cuál.
 */
export async function crearInsumo(
  repo: IInsumoRepository,
  datosCrudos: unknown,
): Promise<Insumo> {
  const datos = crearInsumoInputSchema.parse(datosCrudos);
  return repo.crear(datos);
}
