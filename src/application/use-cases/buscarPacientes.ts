import { IPacienteRepository, ResultadoBusquedaPacientes } from "@/domain/repositories/IPacienteRepository";
import { buscarPacientesQuerySchema } from "../dto/pacienteDto";

/**
 * Caso de uso: búsqueda/listado paginado de pacientes (US2, FR-005, FR-006, research.md #11).
 * También es usado internamente por el motor de sync (pull) para traer el estado
 * autoritativo del servidor — ver research.md #2, #12 y syncEngine.ts.
 */
export async function buscarPacientes(
  repo: IPacienteRepository,
  queryCruda: unknown,
): Promise<ResultadoBusquedaPacientes> {
  const query = buscarPacientesQuerySchema.parse(queryCruda);
  return repo.buscar(query);
}
