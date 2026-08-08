import { v4 as uuid } from "uuid";
import { db, EntidadOutbox, EstadoOutbox, OutboxOperation, TipoOperacionOutbox } from "../db/dexie/db";

/**
 * Cola de sincronización (outbox) — encolar, marcar estado, limpiar. research.md #4 de
 * 001-gestion-pacientes. Generalizada por `entidad` en 004-consultorios (research.md #1):
 * la mecánica de cola es idéntica sin importar qué entidad transporta cada operación, así
 * que ninguna otra función de este archivo cambió.
 */

export async function encolarOperacion(
  entidad: EntidadOutbox,
  entidadId: string,
  tipo: TipoOperacionOutbox,
  payload: unknown,
  baseVersion?: number,
): Promise<void> {
  const operacion: OutboxOperation = {
    id: uuid(),
    entidad,
    entidadId,
    tipo,
    payload,
    baseVersion,
    estado: "PENDIENTE",
    createdAt: new Date().toISOString(),
  };
  await db.outboxOperations.add(operacion);
}

/** Lote de operaciones pendientes, en orden de creación — máx. ~20 (research.md #4). */
export async function obtenerLotePendiente(maxSize = 20): Promise<OutboxOperation[]> {
  return db.outboxOperations
    .where("estado")
    .equals("PENDIENTE" satisfies EstadoOutbox)
    .sortBy("createdAt")
    .then((lista) => lista.slice(0, maxSize));
}

export async function marcarEnviando(ids: string[]): Promise<void> {
  await db.outboxOperations.where("id").anyOf(ids).modify({ estado: "ENVIANDO" });
}

/** Sincronizada con éxito: se elimina del outbox, ya cumplió su función. */
export async function marcarSincronizadaYLimpiar(id: string): Promise<void> {
  await db.outboxOperations.delete(id);
}

/** Aplicada pero con conflicto (o rechazo) — se conserva marcada para que el usuario la vea. */
export async function marcarConflicto(id: string): Promise<void> {
  await db.outboxOperations.update(id, { estado: "CONFLICTO" });
}

/** Ante un fallo de red, se reintenta más tarde. */
export async function revertirAPendiente(ids: string[]): Promise<void> {
  await db.outboxOperations.where("id").anyOf(ids).modify({ estado: "PENDIENTE" });
}

export async function hayOperacionesPendientes(): Promise<boolean> {
  const count = await db.outboxOperations.where("estado").equals("PENDIENTE" satisfies EstadoOutbox).count();
  return count > 0;
}

/** Cuántas quedan pendientes — el total sobre el que el indicador calcula el % del push
 * (011-indicador-sincronizacion, FR-004). */
export async function contarOperacionesPendientes(): Promise<number> {
  return db.outboxOperations.where("estado").equals("PENDIENTE" satisfies EstadoOutbox).count();
}
