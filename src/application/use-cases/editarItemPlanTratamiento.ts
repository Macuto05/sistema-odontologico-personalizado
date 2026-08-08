import {
  IItemPlanTratamientoRepository,
  ResultadoEdicionItemPlanTratamiento,
} from "@/domain/repositories/IItemPlanTratamientoRepository";
import { editarItemPlanTratamientoInputSchema } from "../dto/odontogramaDto";

/** Caso de uso: editar una línea del plan de tratamiento (US5). */
export async function editarItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  id: string,
  datosCrudos: unknown,
): Promise<ResultadoEdicionItemPlanTratamiento> {
  const datos = editarItemPlanTratamientoInputSchema.parse(datosCrudos);
  return repo.editar(id, datos);
}
