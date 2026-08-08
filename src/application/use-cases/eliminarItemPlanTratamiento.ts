import { z } from "zod";
import { IItemPlanTratamientoRepository } from "@/domain/repositories/IItemPlanTratamientoRepository";

const inputSchema = z.object({
  id: z.string().uuid(),
  baseVersion: z.number().int().positive(),
});

/** Caso de uso: eliminar una línea del plan de tratamiento (US5). */
export async function eliminarItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  datosCrudos: unknown,
): Promise<void> {
  const { id, baseVersion } = inputSchema.parse(datosCrudos);
  return repo.eliminar(id, baseVersion);
}
