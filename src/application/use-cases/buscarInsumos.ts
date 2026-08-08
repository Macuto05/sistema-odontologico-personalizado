import {
  IInsumoRepository,
  ResultadoBusquedaInsumos,
} from "@/domain/repositories/IInsumoRepository";
import { buscarInsumosQuerySchema } from "../dto/insumoDto";

/**
 * Caso de uso: búsqueda/listado paginado de insumos (US2, US3 — FR-007 a FR-010).
 * También lo usa el motor de sync (pull) para traer el estado autoritativo del servidor.
 */
export async function buscarInsumos(
  repo: IInsumoRepository,
  queryCruda: unknown,
): Promise<ResultadoBusquedaInsumos> {
  const query = buscarInsumosQuerySchema.parse(queryCruda);
  return repo.buscar(query);
}
