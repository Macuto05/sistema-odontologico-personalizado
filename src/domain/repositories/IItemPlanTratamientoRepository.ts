import {
  DatosEdicionItemPlanTratamiento,
  DatosNuevoItemPlanTratamiento,
  ItemPlanTratamiento,
} from "../entities/ItemPlanTratamiento";

export interface ResultadoEdicionItemPlanTratamiento {
  item: ItemPlanTratamiento;
  conflicto: boolean;
}

/**
 * Puerto de dominio (Principio II) — implementado por ItemPlanTratamientoRepositoryPrisma
 * (servidor) y ItemPlanTratamientoRepositoryDexie (cliente, local-first).
 */
export interface IItemPlanTratamientoRepository {
  crear(datos: DatosNuevoItemPlanTratamiento): Promise<ItemPlanTratamiento>;
  editar(
    id: string,
    datos: DatosEdicionItemPlanTratamiento,
  ): Promise<ResultadoEdicionItemPlanTratamiento>;
  eliminar(id: string, baseVersion: number): Promise<void>;
  /** Ordenado por `fecha` descendente. */
  listarPorPaciente(pacienteId: string): Promise<ItemPlanTratamiento[]>;
}
