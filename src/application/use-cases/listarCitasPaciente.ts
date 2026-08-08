import { ICitaRepository, OpcionesListarCitas } from "@/domain/repositories/ICitaRepository";
import { Cita } from "@/domain/entities/Cita";

/**
 * Caso de uso: historial de citas anteriores (US7, FR-021). Por defecto solo trae citas
 * `FINALIZADA` — es lo que evita que la cita en curso actual aparezca en su propio
 * historial (FR-022), ya que esta siempre está en `EN_CURSO` mientras se la atiende.
 */
export async function listarCitasPaciente(
  repo: ICitaRepository,
  pacienteId: string,
  opciones: OpcionesListarCitas = {},
): Promise<Cita[]> {
  return repo.listarPorPaciente(pacienteId, { estado: "FINALIZADA", ...opciones });
}
