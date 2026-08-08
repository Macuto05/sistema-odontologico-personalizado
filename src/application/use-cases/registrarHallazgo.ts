import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { HallazgoDental, Odontograma, ResultadoEdicionOdontograma } from "@/domain/entities/Odontograma";
import { crearCambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { CondicionInvalidaError } from "@/domain/errors";
import { hallazgoInputSchema } from "../dto/odontogramaDto";

export interface RegistrarHallazgoRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

/**
 * Caso de uso: marcar un hallazgo en el odontograma (US1, FR-003 a FR-007, FR-009, FR-012
 * a FR-015, FR-020). Agrega el hallazgo al array vigente sin reemplazar los existentes
 * (coexistencia, FR-020) y registra el cambio en el historial de auditoría en la misma
 * operación (research.md #3). `condicionId` es el único dato del catálogo que este caso de
 * uso resuelve fuera del schema — la exclusividad de dentición (`exclusivoNino`) requiere
 * contexto externo (`odontograma.denticion`) que `hallazgoInputSchema` no tiene.
 */
export async function registrarHallazgo(
  repos: RegistrarHallazgoRepos,
  odontograma: Odontograma,
  datosCrudos: unknown,
): Promise<ResultadoEdicionOdontograma> {
  const datos = hallazgoInputSchema.parse(datosCrudos);
  const condicion = buscarCondicion(datos.condicionId);
  if (!condicion) {
    throw new CondicionInvalidaError(`Condición desconocida: ${datos.condicionId}`);
  }
  if (condicion.exclusivoNino && odontograma.denticion !== "NINO") {
    throw new CondicionInvalidaError(
      `${condicion.nombre} solo está disponible en la dentición Niño (FR-012)`,
    );
  }

  const nuevoHallazgo: HallazgoDental = {
    ...datos,
    // Estado por defecto "pendiente" (rojo) para condiciones que admiten el color pero no
    // especificaron uno explícito — un hallazgo recién marcado todavía no está realizado.
    estadoColor: datos.estadoColor ?? (condicion.admiteEstadoColor ? "PENDIENTE" : null),
  };

  const resultado = await repos.odontogramaRepo.editar(odontograma.id, {
    hallazgos: [...odontograma.hallazgos, nuevoHallazgo],
    notas: odontograma.notas,
    baseVersion: odontograma.version,
  });

  const cambio = crearCambioOdontograma(uuid(), {
    odontogramaId: odontograma.id,
    pacienteId: odontograma.pacienteId,
    denticion: odontograma.denticion,
    tipoCambio: "AGREGADO",
    hallazgoId: nuevoHallazgo.id,
    dientes: nuevoHallazgo.dientes,
    superficie: nuevoHallazgo.superficie,
    condicionNombre: condicion.nombre,
    snapshot: nuevoHallazgo,
  });
  await repos.cambioRepo.registrar(cambio);

  return resultado;
}
