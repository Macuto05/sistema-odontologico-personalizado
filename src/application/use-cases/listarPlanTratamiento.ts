import { z } from "zod";
import { IItemPlanTratamientoRepository } from "@/domain/repositories/IItemPlanTratamientoRepository";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";

const inputSchema = z.object({ pacienteId: z.string().uuid() });

/** Caso de uso: listar el plan de tratamiento de un paciente (US5). */
export async function listarPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  datosCrudos: unknown,
): Promise<ItemPlanTratamiento[]> {
  const { pacienteId } = inputSchema.parse(datosCrudos);
  return repo.listarPorPaciente(pacienteId);
}
