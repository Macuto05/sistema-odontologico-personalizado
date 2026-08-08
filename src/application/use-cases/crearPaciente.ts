import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { Paciente } from "@/domain/entities/Paciente";
import { crearPacienteInputSchema } from "../dto/pacienteDto";

/**
 * Caso de uso: alta de paciente (US1, FR-001 a FR-004).
 * Valida con Zod (Principio III) y delega la unicidad de documento al repositorio, que
 * puede ser PacienteRepositoryPrisma (servidor) o PacienteRepositoryDexie (cliente,
 * local-first) — este caso de uso no sabe ni le importa cuál.
 */
export async function crearPaciente(
  repo: IPacienteRepository,
  datosCrudos: unknown,
): Promise<Paciente> {
  const datos = crearPacienteInputSchema.parse(datosCrudos);
  return repo.crear(datos);
}
