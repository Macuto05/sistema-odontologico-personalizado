import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { Odontograma, ResultadoEdicionOdontograma } from "@/domain/entities/Odontograma";
import { crearCambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { CondicionInvalidaError } from "@/domain/errors";

export interface EliminarHallazgoRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

/** Caso de uso: eliminar un hallazgo ya registrado (US3, FR-008). */
export async function eliminarHallazgo(
  repos: EliminarHallazgoRepos,
  odontograma: Odontograma,
  hallazgoId: string,
): Promise<ResultadoEdicionOdontograma> {
  const existente = odontograma.hallazgos.find((h) => h.id === hallazgoId);
  if (!existente) {
    throw new CondicionInvalidaError(`Hallazgo no encontrado: ${hallazgoId}`);
  }
  const condicion = buscarCondicion(existente.condicionId);

  const hallazgos = odontograma.hallazgos.filter((h) => h.id !== hallazgoId);
  const resultado = await repos.odontogramaRepo.editar(odontograma.id, {
    hallazgos,
    notas: odontograma.notas,
    baseVersion: odontograma.version,
  });

  const cambio = crearCambioOdontograma(uuid(), {
    odontogramaId: odontograma.id,
    pacienteId: odontograma.pacienteId,
    denticion: odontograma.denticion,
    tipoCambio: "ELIMINADO",
    hallazgoId,
    dientes: existente.dientes,
    superficie: existente.superficie,
    condicionNombre: condicion?.nombre ?? existente.condicionId,
    snapshot: existente,
  });
  await repos.cambioRepo.registrar(cambio);

  return resultado;
}
