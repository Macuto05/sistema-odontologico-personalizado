import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import {
  DatosEdicionItemPlanTratamiento,
  DatosNuevoItemPlanTratamiento,
  ItemPlanTratamiento,
  crearItemPlanTratamientoDesdeDatos,
} from "@/domain/entities/ItemPlanTratamiento";
import {
  IItemPlanTratamientoRepository,
  ResultadoEdicionItemPlanTratamiento,
} from "@/domain/repositories/IItemPlanTratamientoRepository";
import { ItemPlanTratamientoNoEncontradoError } from "@/domain/errors";

/** Implementación cliente (local-first) de IItemPlanTratamientoRepository — mismo patrón
 * que OdontogramaRepositoryDexie/CitaRepositoryDexie. */
export class ItemPlanTratamientoRepositoryDexie implements IItemPlanTratamientoRepository {
  async crear(datos: DatosNuevoItemPlanTratamiento): Promise<ItemPlanTratamiento> {
    const nuevo = crearItemPlanTratamientoDesdeDatos(datos);
    await db.itemsPlanTratamiento.add(nuevo);
    await encolarOperacion(
      "ITEM_PLAN_TRATAMIENTO",
      nuevo.id,
      "CREAR",
      nuevo,
      nuevo.version,
    );
    return nuevo;
  }

  async editar(
    id: string,
    datos: DatosEdicionItemPlanTratamiento,
  ): Promise<ResultadoEdicionItemPlanTratamiento> {
    const actual = await db.itemsPlanTratamiento.get(id);
    if (!actual) throw new ItemPlanTratamientoNoEncontradoError(id);

    const actualizado: ItemPlanTratamiento = {
      ...actual,
      ...("fecha" in datos ? { fecha: datos.fecha ?? actual.fecha } : {}),
      ...("diente" in datos ? { diente: datos.diente ?? null } : {}),
      ...("tratamiento" in datos ? { tratamiento: datos.tratamiento ?? actual.tratamiento } : {}),
      ...("fechaRealizado" in datos ? { fechaRealizado: datos.fechaRealizado ?? null } : {}),
      ...("nota" in datos ? { nota: datos.nota ?? null } : {}),
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.itemsPlanTratamiento.put(actualizado);
    await encolarOperacion(
      "ITEM_PLAN_TRATAMIENTO",
      id,
      "EDITAR",
      actualizado,
      datos.baseVersion,
    );
    return { item: actualizado, conflicto: false };
  }

  async eliminar(id: string, baseVersion: number): Promise<void> {
    const actual = await db.itemsPlanTratamiento.get(id);
    if (!actual) throw new ItemPlanTratamientoNoEncontradoError(id);
    await db.itemsPlanTratamiento.delete(id);
    await encolarOperacion("ITEM_PLAN_TRATAMIENTO", id, "ELIMINAR", { id }, baseVersion);
  }

  async listarPorPaciente(pacienteId: string): Promise<ItemPlanTratamiento[]> {
    const todos = await db.itemsPlanTratamiento.where("pacienteId").equals(pacienteId).toArray();
    return todos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
