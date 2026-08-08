import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";
import { Consultorio } from "@/domain/entities/Consultorio";
import { crearConsultorioInputSchema } from "../dto/consultorioDto";

/**
 * Caso de uso: alta de consultorio (US1, FR-001 a FR-003).
 * Valida con Zod y delega la unicidad de nombre al repositorio, que puede ser
 * ConsultorioRepositoryPrisma (servidor) o ConsultorioRepositoryDexie (cliente,
 * local-first) — este caso de uso no sabe ni le importa cuál.
 */
export async function crearConsultorio(
  repo: IConsultorioRepository,
  datosCrudos: unknown,
): Promise<Consultorio> {
  const datos = crearConsultorioInputSchema.parse(datosCrudos);
  return repo.crear(datos);
}
