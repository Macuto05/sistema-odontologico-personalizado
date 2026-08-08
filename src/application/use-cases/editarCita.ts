import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { ResultadoEdicionCita } from "@/domain/entities/Cita";
import { editarCitaInputSchema } from "../dto/citaDto";

/**
 * Caso de uso: edición de una cita en curso (US2 a US4 — Diagnóstico, Receta, Estudios).
 * Solo valida la forma de los datos de entrada (partial, cada tab manda solo lo suyo); el
 * repositorio decide bloqueo por cita finalizada y conflicto de versión.
 */
export async function editarCita(
  repo: ICitaRepository,
  id: string,
  datosCrudos: unknown,
): Promise<ResultadoEdicionCita> {
  const datos = editarCitaInputSchema.parse(datosCrudos);
  return repo.editar(id, datos);
}
