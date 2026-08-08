import {
  IItemPlanTratamientoRepository,
  ResultadoEdicionItemPlanTratamiento,
} from "@/domain/repositories/IItemPlanTratamientoRepository";

/**
 * Caso de uso: tildar/destildar el checkbox "Realizado" de una línea del plan de tratamiento
 * desde la pestaña Planes (009-planes-tratamiento, US2, FR-004 a FR-007). La fecha de
 * realización se calcula acá mismo (nunca recibida como parámetro, research.md #4) — esta
 * es la única forma de escribir `fechaRealizado` en todo el sistema. La firma angosta (solo
 * `id`/`realizado`/`baseVersion`, nunca `fecha`/`diente`/`tratamiento`) es lo que hace que
 * FR-010 (Planes no puede tocar esos campos) sea imposible de violar por código, no solo
 * algo que la UI no ofrece (research.md #3, Principio III).
 */
export async function marcarRealizadoItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  id: string,
  realizado: boolean,
  baseVersion: number,
): Promise<ResultadoEdicionItemPlanTratamiento> {
  const fechaRealizado = realizado ? new Date().toISOString().slice(0, 10) : null;
  return repo.editar(id, { fechaRealizado, baseVersion });
}
