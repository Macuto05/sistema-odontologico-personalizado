import { IItemPlanTratamientoRepository } from "@/domain/repositories/IItemPlanTratamientoRepository";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import { itemPlanTratamientoInputSchema } from "../dto/odontogramaDto";

/** Caso de uso: agregar una línea al plan de tratamiento (US5, FR-016). */
export async function crearItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  pacienteId: string,
  id: string,
  datosCrudos: unknown,
): Promise<ItemPlanTratamiento> {
  const datos = itemPlanTratamientoInputSchema.parse(datosCrudos);
  return repo.crear({ id, pacienteId, ...datos });
}
