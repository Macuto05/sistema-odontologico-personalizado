import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { Cita } from "@/domain/entities/Cita";
import { crearCitaInputSchema } from "../dto/citaDto";

/**
 * Caso de uso: iniciar (o reabrir) la atención de un paciente (US1, FR-001 a FR-004).
 * La restricción de que el paciente esté activo se aplica en dos lugares que no son este
 * caso de uso: la UI oculta el botón para un paciente archivado, y el servidor la
 * revalida de forma autoritativa al sincronizar (`aplicarOperacionCita`,
 * contracts/citas-api.md, research.md #10) — no hace falta que este caso de uso dependa
 * de `IPacienteRepository` solo para repetir una validación que ya se hace en el borde.
 */
export async function crearOAbrirCita(repo: ICitaRepository, datosCrudos: unknown): Promise<Cita> {
  const datos = crearCitaInputSchema.parse(datosCrudos);
  return repo.crearOAbrir(datos);
}
