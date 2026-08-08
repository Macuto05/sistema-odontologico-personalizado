import { IPacienteRepository, ResultadoEdicion } from "@/domain/repositories/IPacienteRepository";
import { editarPacienteInputSchema } from "../dto/pacienteDto";

/**
 * Caso de uso: edición de paciente (US3, FR-007, FR-008).
 * El repositorio decide unicidad/bloqueo por archivado/conflicto de versión — este caso de
 * uso solo valida la forma de los datos de entrada.
 */
export async function editarPaciente(
  repo: IPacienteRepository,
  id: string,
  datosCrudos: unknown,
): Promise<ResultadoEdicion> {
  const datos = editarPacienteInputSchema.parse(datosCrudos);
  return repo.editar(id, datos);
}
