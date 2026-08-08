import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";

/**
 * Caso de uso: baja de consultorio (US1, FR-004). Idempotente por contrato del
 * repositorio (research.md #2 de 004-consultorios) — no hay nada más que validar acá.
 */
export async function eliminarConsultorio(repo: IConsultorioRepository, id: string): Promise<void> {
  await repo.eliminar(id);
}
