import {
  IInsumoRepository,
  ResultadoEdicionInsumo,
} from "@/domain/repositories/IInsumoRepository";
import { editarInsumoInputSchema } from "../dto/insumoDto";

/**
 * Caso de uso: edición de insumo, incluida la actualización de stock por reposición o
 * consumo (US4, FR-011, FR-012).
 * El repositorio decide el bloqueo por archivado y el conflicto de versión — este caso de
 * uso solo valida la forma de los datos de entrada.
 */
export async function editarInsumo(
  repo: IInsumoRepository,
  id: string,
  datosCrudos: unknown,
): Promise<ResultadoEdicionInsumo> {
  const datos = editarInsumoInputSchema.parse(datosCrudos);
  return repo.editar(id, datos);
}
