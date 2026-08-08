import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { Paciente } from "@/domain/entities/Paciente";

/** Caso de uso: reactivar un paciente archivado (US4, FR-010). */
export async function reactivarPaciente(repo: IPacienteRepository, id: string): Promise<Paciente> {
  return repo.reactivar(id);
}
