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
  await db.outboxOperations
    .where("id")
    .anyOf(ids)
    .modify({ estado: "ENVIANDO", enviandoDesde: new Date().toISOString() });
}

/**
 * Pasado este tiempo, una operación en `ENVIANDO` se da por huérfana. Es mayor que el
 * timeout del POST de sync (syncEngine.ts), así que un envío que todavía está en vuelo
 * nunca se toma por huérfano.
 */
export const ANTIGUEDAD_ENVIO_HUERFANO_MS = 2 * 60_000;

/** Un envío quedó huérfano si nadie va a resolverlo: lleva más de `umbralMs` en `ENVIANDO`
 * o no tiene marca de cuándo empezó (marcado antes de que existiera `enviandoDesde`). */
export function esEnvioHuerfano(
  op: Pick<OutboxOperation, "estado" | "enviandoDesde">,
  ahora: number,
  umbralMs = ANTIGUEDAD_ENVIO_HUERFANO_MS,
): boolean {
  if (op.estado !== "ENVIANDO") return false;
  if (!op.enviandoDesde) return true;
  const desde = Date.parse(op.enviandoDesde);
  return Number.isNaN(desde) || ahora - desde > umbralMs;
}

/**
 * Devuelve a `PENDIENTE` las operaciones que quedaron en `ENVIANDO` sin que nadie las
 * resuelva. Pasa cuando el teléfono cierra o congela la app en medio de un envío (bloquear
 * la pantalla, cambiar de app): `revertirAPendiente` nunca corre y, como el lote solo toma
 * `PENDIENTE`, esas operaciones no se volvían a enviar NUNCA, aunque el indicador las seguía
 * contando como "por sincronizar" (reportado: 3 cambios trabados por días en el teléfono de
 * la odontóloga, el indicador alternando entre "Sincronizando" y "3 por sincronizar").
 * Reenviarlas es seguro: el servidor es idempotente por `id` de operación.
 */
export async function recuperarEnviosHuerfanos(
  umbralMs = ANTIGUEDAD_ENVIO_HUERFANO_MS,
  ahora = Date.now(),
): Promise<number> {
  return db.outboxOperations
    .where("estado")
    .equals("ENVIANDO" satisfies EstadoOutbox)
    .and((op) => esEnvioHuerfano(op, ahora, umbralMs))
    .modify({ estado: "PENDIENTE" });
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
