import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import {
  DatosEdicionOdontograma,
  DatosNuevoOdontograma,
  Odontograma,
  ResultadoEdicionOdontograma,
  crearOdontogramaVacio,
} from "@/domain/entities/Odontograma";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { OdontogramaNoEncontradoError } from "@/domain/errors";

/**
 * Implementación cliente (local-first) de IOdontogramaRepository — lee/escribe siempre
 * contra IndexedDB (Dexie), con o sin conexión, igual que CitaRepositoryDexie. La
 * detección de conflicto real ocurre en el servidor durante la sincronización — acá
 * `editar()` siempre aplica de forma optimista (`conflicto: false`).
 */
export class OdontogramaRepositoryDexie implements IOdontogramaRepository {
  /** research.md #10: crea vacío la primera vez, sin acción explícita del usuario. Usa
   * siempre `datos.id` al crear — nunca genera uno propio (ver IOdontogramaRepository). */
  async obtenerOCrear(datos: DatosNuevoOdontograma): Promise<Odontograma> {
    const existente = await db.odontogramas
      .where("[pacienteId+denticion]")
      .equals([datos.pacienteId, datos.denticion])
      .first();
    if (existente) return existente;

    const nuevo = crearOdontogramaVacio(datos);
    await db.odontogramas.add(nuevo);
    await encolarOperacion(
      "ODONTOGRAMA",
      nuevo.id,
      "CREAR",
      { id: nuevo.id, pacienteId: nuevo.pacienteId, denticion: nuevo.denticion },
      nuevo.version,
    );
    return nuevo;
  }

  async editar(
    id: string,
    datos: DatosEdicionOdontograma,
  ): Promise<ResultadoEdicionOdontograma> {
    const actual = await db.odontogramas.get(id);
    if (!actual) throw new OdontogramaNoEncontradoError(id);

    const actualizado: Odontograma = {
      ...actual,
      hallazgos: datos.hallazgos,
      notas: datos.notas,
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.odontogramas.put(actualizado);
    await encolarOperacion("ODONTOGRAMA", id, "EDITAR", actualizado, datos.baseVersion);
    return { odontograma: actualizado, conflicto: false };
  }
}
