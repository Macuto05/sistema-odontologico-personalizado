import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import {
  ICambioOdontogramaRepository,
  OpcionesListarCambios,
} from "@/domain/repositories/ICambioOdontogramaRepository";

/**
 * Implementación cliente (local-first) de ICambioOdontogramaRepository. `registrar` siempre
 * hace `add` (nunca `put` sobre un id existente) — refuerza en el código el append-only ya
 * exigido por el tipo del puerto (research.md #4).
 */
export class CambioOdontogramaRepositoryDexie implements ICambioOdontogramaRepository {
  async registrar(cambio: CambioOdontograma): Promise<void> {
    await db.cambiosOdontograma.add(cambio);
    await encolarOperacion("CAMBIO_ODONTOGRAMA", cambio.id, "CREAR", cambio);
  }

  async listarPorOdontograma(
    odontogramaId: string,
    opciones: OpcionesListarCambios = {},
  ): Promise<CambioOdontograma[]> {
    const todos = await db.cambiosOdontograma
      .where("odontogramaId")
      .equals(odontogramaId)
      .toArray();
    const ordenados = todos.sort((a, b) => b.registradoEn.localeCompare(a.registradoEn));
    const { pagina = 1, limite = 50 } = opciones;
    const inicio = (pagina - 1) * limite;
    return ordenados.slice(inicio, inicio + limite);
  }
}
