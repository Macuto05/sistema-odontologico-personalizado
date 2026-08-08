import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import { Consultorio, DatosNuevoConsultorio } from "@/domain/entities/Consultorio";
import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";
import { NombreConsultorioDuplicadoError } from "@/domain/errors";

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase();
}

/**
 * Implementación cliente (local-first) de IConsultorioRepository — lee/escribe siempre
 * contra IndexedDB (Dexie), con o sin conexión (research.md #1, #2). Sin `version`/
 * `conflictoPendiente`: no hay edición, solo `crear`/`eliminar` (research.md #2).
 */
export class ConsultorioRepositoryDexie implements IConsultorioRepository {
  async crear(datos: DatosNuevoConsultorio): Promise<Consultorio> {
    const existente = await db.consultorios
      .filter((c) => normalizar(c.nombre) === normalizar(datos.nombre))
      .first();
    if (existente) throw new NombreConsultorioDuplicadoError(existente);

    const nuevo: Consultorio = {
      id: datos.id,
      nombre: datos.nombre,
      createdAt: new Date().toISOString(),
    };
    await db.consultorios.add(nuevo);
    await encolarOperacion("CONSULTORIO", nuevo.id, "CREAR", nuevo);
    return nuevo;
  }

  async listar(): Promise<Consultorio[]> {
    return db.consultorios.orderBy("nombre").toArray();
  }

  async obtenerPorId(id: string): Promise<Consultorio | null> {
    return (await db.consultorios.get(id)) ?? null;
  }

  /**
   * Idempotente (FR-004, research.md #2): eliminar un id que ya no existe no es error.
   * Anula `consultorioId` en los pacientes locales que lo referenciaban (FR-005,
   * research.md #6) — Dexie no tiene FKs, así que esto se hace explícitamente acá, igual
   * que en la reconciliación del pull (syncEngine.ts).
   */
  async eliminar(id: string): Promise<void> {
    const existente = await this.obtenerPorId(id);
    if (!existente) return;

    // `consultorioId` no está indexado (uso poco frecuente, tabla acotada — Principio
    // VIII no exige indexar todo, solo lo que se consulta seguido); `.filter()` recorre
    // la tabla en memoria en vez de usar `.where()`, que exige un índice.
    await db.pacientes.filter((p) => p.consultorioId === id).modify({ consultorioId: null });
    await db.consultorios.delete(id);
    await encolarOperacion("CONSULTORIO", id, "ELIMINAR", { id });
  }
}
