import { z } from "zod";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { Odontograma } from "@/domain/entities/Odontograma";

const inputSchema = z.object({
  id: z.string().uuid(),
  pacienteId: z.string().uuid(),
  denticion: z.enum(["ADULTO", "NINO"]),
});

/**
 * Caso de uso: obtener el Odontograma vigente de un paciente para una dentición dada,
 * creándolo vacío la primera vez que se necesita — sin ninguna acción explícita del
 * usuario (US1, US2; research.md #10). `id` lo genera el llamador (mismo criterio que
 * `crearOAbrirCita`) — solo se usa si hace falta crear uno nuevo.
 */
export async function obtenerOCrearOdontograma(
  repo: IOdontogramaRepository,
  datosCrudos: unknown,
): Promise<Odontograma> {
  const datos = inputSchema.parse(datosCrudos);
  return repo.obtenerOCrear(datos);
}
