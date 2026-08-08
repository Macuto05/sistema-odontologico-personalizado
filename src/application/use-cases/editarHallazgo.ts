import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { Odontograma, ResultadoEdicionOdontograma } from "@/domain/entities/Odontograma";
import { crearCambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { CondicionInvalidaError } from "@/domain/errors";
import { hallazgoInputSchema } from "../dto/odontogramaDto";

export interface EditarHallazgoRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

/**
 * Caso de uso: editar un hallazgo ya registrado (US3, FR-008) — incluye cambiar su
 * `estadoColor` (pendiente↔realizado) sin necesidad de eliminarlo y volver a crearlo.
 * Reemplaza el hallazgo completo dentro del array (mismo criterio que `registrarHallazgo`).
 */
export async function editarHallazgo(
  repos: EditarHallazgoRepos,
  odontograma: Odontograma,
  hallazgoId: string,
  datosCrudos: unknown,
): Promise<ResultadoEdicionOdontograma> {
  const existente = odontograma.hallazgos.find((h) => h.id === hallazgoId);
  if (!existente) {
    throw new CondicionInvalidaError(`Hallazgo no encontrado: ${hallazgoId}`);
  }

  const datos = hallazgoInputSchema.parse({
    ...(datosCrudos as object),
    id: hallazgoId,
    registradoEn: existente.registradoEn,
  });
  const condicion = buscarCondicion(datos.condicionId);
  if (!condicion) {
    throw new CondicionInvalidaError(`Condición desconocida: ${datos.condicionId}`);
  }
  if (condicion.exclusivoNino && odontograma.denticion !== "NINO") {
    throw new CondicionInvalidaError(
      `${condicion.nombre} solo está disponible en la dentición Niño (FR-012)`,
    );
  }

  const hallazgos = odontograma.hallazgos.map((h) => (h.id === hallazgoId ? datos : h));
  const resultado = await repos.odontogramaRepo.editar(odontograma.id, {
    hallazgos,
    notas: odontograma.notas,
    baseVersion: odontograma.version,
  });

  const cambio = crearCambioOdontograma(uuid(), {
    odontogramaId: odontograma.id,
    pacienteId: odontograma.pacienteId,
    denticion: odontograma.denticion,
    tipoCambio: "EDITADO",
    hallazgoId,
    dientes: datos.dientes,
    superficie: datos.superficie,
    condicionNombre: condicion.nombre,
    snapshot: datos,
  });
  await repos.cambioRepo.registrar(cambio);

  return resultado;
}
