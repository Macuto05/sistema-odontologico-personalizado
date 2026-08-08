import { z } from "zod";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";

const inputSchema = z.object({
  odontogramaId: z.string().uuid(),
  pagina: z.number().int().positive().optional(),
  limite: z.number().int().positive().optional(),
});

/**
 * Caso de uso: listar el historial de cambios de un Odontograma, ordenado de más reciente
 * a más antiguo (US4, FR-009, FR-010).
 */
export async function listarHistorialOdontograma(
  repo: ICambioOdontogramaRepository,
  datosCrudos: unknown,
): Promise<CambioOdontograma[]> {
  const { odontogramaId, pagina, limite } = inputSchema.parse(datosCrudos);
  return repo.listarPorOdontograma(odontogramaId, { pagina, limite });
}
