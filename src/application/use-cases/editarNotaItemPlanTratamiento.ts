import {
  IItemPlanTratamientoRepository,
  ResultadoEdicionItemPlanTratamiento,
} from "@/domain/repositories/IItemPlanTratamientoRepository";

/**
 * Caso de uso: editar la nota libre de una línea del plan de tratamiento desde la pestaña
 * Planes (009-planes-tratamiento, US4, FR-008). Misma firma angosta que
 * `marcarRealizadoItemPlanTratamiento` — solo `id`/`nota`/`baseVersion`, nunca
 * `fecha`/`diente`/`tratamiento` (FR-010, research.md #3).
 */
export async function editarNotaItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  id: string,
  nota: string,
  baseVersion: number,
): Promise<ResultadoEdicionItemPlanTratamiento> {
  const notaNormalizada = nota.trim() === "" ? null : nota.trim();
  return repo.editar(id, { nota: notaNormalizada, baseVersion });
}
