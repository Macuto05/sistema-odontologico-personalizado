import { IPacienteRepository, ResultadoArchivado } from "@/domain/repositories/IPacienteRepository";

/** Caso de uso: archivar (baja lógica) un paciente (US4, FR-009). Idempotente si ya estaba archivado. */
export async function archivarPaciente(
  repo: IPacienteRepository,
  id: string,
): Promise<ResultadoArchivado> {
  return repo.archivar(id);
}
