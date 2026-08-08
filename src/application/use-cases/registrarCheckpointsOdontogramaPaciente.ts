import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { Denticion } from "@/domain/entities/Odontograma";
import { crearCheckpointOdontograma } from "@/domain/entities/CambioOdontograma";

export interface RegistrarCheckpointsRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

const DENTICIONES: Denticion[] = ["ADULTO", "NINO"];

/** Sin límite de página — este use-case necesita ver TODOS los cambios desde el último
 * checkpoint, no solo los primeros 50 (default de ambos repos). */
const SIN_LIMITE_DE_PAGINA = 10_000;

function describirCheckpoint(cambiosNuevos: number): string {
  return cambiosNuevos === 1 ? "1 cambio guardado" : `${cambiosNuevos} cambios guardados`;
}

/**
 * Cierra una sesión de edición del Odontograma — botón "Listo" en la ficha del paciente, o
 * "Finalizar atención" en una Cita (revisión posterior a la primera versión de la pestaña
 * Historial). Si hubo cambios reales desde el último checkpoint, archiva en el historial
 * cómo se veía el odontograma justo antes de esta sesión; si no hubo ningún cambio (el
 * odontólogo entró y salió de "Editar" sin tocar nada), no crea ninguna entrada — evita
 * llenar el historial de checkpoints vacíos.
 *
 * Revisa ambas denticiones (ADULTO y NIÑO): quien dispara esto (el botón "Listo"/"Finalizar
 * atención") no sabe cuál de las dos se editó, y esta operación es barata/no-op cuando no
 * hubo cambios en una de ellas.
 */
export async function registrarCheckpointsOdontogramaPaciente(
  repos: RegistrarCheckpointsRepos,
  pacienteId: string,
): Promise<void> {
  for (const denticion of DENTICIONES) {
    const odontograma = await repos.odontogramaRepo.obtenerOCrear({
      id: uuid(),
      pacienteId,
      denticion,
    });

    const cambios = await repos.cambioRepo.listarPorOdontograma(odontograma.id, {
      limite: SIN_LIMITE_DE_PAGINA,
    });

    const ultimoCheckpoint = cambios.find((c) => c.tipoCambio === "CHECKPOINT");
    const desde = ultimoCheckpoint?.registradoEn ?? "";
    const cambiosNuevos = cambios.filter(
      (c) => c.tipoCambio !== "CHECKPOINT" && c.registradoEn > desde,
    );
    if (cambiosNuevos.length === 0) continue;

    await repos.cambioRepo.registrar(
      crearCheckpointOdontograma(uuid(), {
        odontogramaId: odontograma.id,
        pacienteId: odontograma.pacienteId,
        denticion: odontograma.denticion,
        descripcion: describirCheckpoint(cambiosNuevos.length),
      }),
    );
  }
}
