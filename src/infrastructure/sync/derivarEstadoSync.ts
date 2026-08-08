import { EntidadOutbox, OutboxOperation, TipoOperacionOutbox } from "../db/dexie/db";
import { EstadoProgresoSync } from "./syncStatus";

/**
 * Estado que muestra el indicador de sincronización — 011-indicador-sincronizacion,
 * data-model.md. Función pura, sin React ni Dexie: toda la lógica de prioridad entre estados
 * (FR-009) vive acá para poder probarla sin montar un componente ni una base local
 * (Principio I, Principio II).
 */

export interface EntidadEnConflicto {
  entidad: EntidadOutbox;
  entidadId: string;
  /**
   * Tipos de operación en conflicto sobre este registro, sin repetir. Un mismo registro puede
   * acumular varias (ej. CREAR y EDITAR del mismo odontograma), y todas quedan pendientes de
   * revisión — no se descarta ninguna (Principio III).
   */
  tipos: TipoOperacionOutbox[];
  /**
   * Nombre propio del registro (Paciente, Consultorio, Insumo), o `null` si su entidad no
   * tiene uno. Deliberadamente `null` y no el `entidadId`: un uuid crudo en pantalla no le dice
   * nada al odontólogo.
   */
  nombre: string | null;
  /** Paciente dueño del registro, cuando el payload lo trae (odontograma, cita, plan). */
  pacienteId: string | null;
  /**
   * Nombre de ese paciente, resuelto contra la base local. Es lo que hace identificable a un
   * odontograma o una cita, que por sí solos no tienen nombre.
   */
  nombrePaciente: string | null;
}

export type EstadoSyncUI =
  | { tipo: "OFFLINE"; pendientes: number }
  | { tipo: "SINCRONIZANDO"; progreso: { total: number; enviadas: number } | null }
  | { tipo: "CONFLICTO"; entidades: EntidadEnConflicto[] }
  | { tipo: "AL_DIA"; ultimaSincronizacion: string | null };

export interface EntradaEstadoSync {
  online: boolean;
  /** Operaciones del outbox aún sin confirmar (`PENDIENTE` + `ENVIANDO`). */
  pendientes: number;
  conflictos: OutboxOperation[];
  progreso: EstadoProgresoSync;
  /** ISO string del fin del último ciclo completo, o `null` si nunca hubo uno. */
  ultimaSincronizacion: string | null;
  /**
   * Nombres de paciente ya resueltos, indexados por id. Se recibe como dato en vez de
   * consultarse acá adentro para que esta función siga siendo pura y testeable sin Dexie
   * (Principio II) — quien la llama (`useSyncStatus`) es el que sabe leer de la base local.
   */
  nombresPorPacienteId?: Record<string, string>;
}

/**
 * Nombre legible del registro en conflicto, o `null` si no hay ninguno. El payload de la
 * operación es el mismo cuerpo que se le mandó a `/api/sync`, así que para algunas entidades
 * trae el nombre — pero es `unknown` y puede venir de una versión anterior del outbox, por eso
 * se accede defensivamente.
 */
function camposDe(operacion: OutboxOperation): Record<string, unknown> | null {
  const payload = operacion.payload;
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

function textoNoVacio(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor : null;
}

function nombreDe(operacion: OutboxOperation): string | null {
  const campos = camposDe(operacion);
  if (!campos) return null;
  // `nombreCompleto` cubre Paciente; `nombre` cubre Consultorio e Insumo. Cita, Odontograma,
  // CambioOdontograma e ItemPlanTratamiento no llevan ningún nombre propio en su payload.
  return textoNoVacio(campos.nombreCompleto) ?? textoNoVacio(campos.nombre);
}

/**
 * Paciente dueño del registro, para poder identificar en pantalla entidades que no tienen
 * nombre propio (odontograma, cita, ítem de plan — todas llevan `pacienteId` en su payload).
 *
 * `CAMBIO_ODONTOGRAMA` queda afuera a propósito: su payload referencia `odontogramaId`, no el
 * paciente, así que resolverlo necesitaría un salto más contra la base local. Es la entidad
 * menos probable de entrar en conflicto (es append-only, nunca compite por una `version`).
 */
function pacienteIdDe(operacion: OutboxOperation): string | null {
  const campos = camposDe(operacion);
  if (!campos) return null;
  return textoNoVacio(campos.pacienteId);
}

/**
 * Agrupa las operaciones en conflicto por registro afectado. Sin esto, un registro con dos
 * operaciones fallidas (ej. CREAR y EDITAR del mismo odontograma) aparecería repetido en el
 * panel — y, como la clave de React era `entidad-entidadId`, además rompía el renderizado por
 * claves duplicadas.
 */
function agruparPorRegistro(
  operaciones: OutboxOperation[],
  nombresPorPacienteId: Record<string, string>,
): EntidadEnConflicto[] {
  const porRegistro = new Map<string, EntidadEnConflicto>();

  for (const operacion of operaciones) {
    const clave = `${operacion.entidad}|${operacion.entidadId}`;
    const existente = porRegistro.get(clave);

    if (!existente) {
      porRegistro.set(clave, {
        entidad: operacion.entidad,
        entidadId: operacion.entidadId,
        tipos: [operacion.tipo],
        nombre: nombreDe(operacion),
        pacienteId: pacienteIdDe(operacion),
        nombrePaciente: null, // se completa abajo, con el mapa ya resuelto
      });
      continue;
    }

    if (!existente.tipos.includes(operacion.tipo)) existente.tipos.push(operacion.tipo);
    // Basta con que una de las operaciones del registro traiga el dato para poder mostrarlo:
    // `CREAR` lleva el objeto completo, mientras que `ARCHIVAR` o `FINALIZAR` solo mandan
    // `{ id }` o `{}`.
    existente.nombre ??= nombreDe(operacion);
    existente.pacienteId ??= pacienteIdDe(operacion);
  }

  return [...porRegistro.values()].map((registro) => ({
    ...registro,
    nombrePaciente: registro.pacienteId
      ? (nombresPorPacienteId[registro.pacienteId] ?? null)
      : null,
  }));
}

/**
 * Prioridad (FR-009): OFFLINE > SINCRONIZANDO > CONFLICTO > AL_DIA.
 *
 * El orden no es arbitrario: sin conexión no tiene sentido hablar de progreso ni de
 * conflictos (nada se está enviando), y mientras el envío está en curso la alerta de
 * conflicto sería prematura — puede resolverse sola en este mismo ciclo.
 */
export function derivarEstadoSync(entrada: EntradaEstadoSync): EstadoSyncUI {
  if (!entrada.online) {
    return { tipo: "OFFLINE", pendientes: entrada.pendientes };
  }

  if (entrada.progreso.fase === "PUSH") {
    return {
      tipo: "SINCRONIZANDO",
      progreso: { total: entrada.progreso.total, enviadas: entrada.progreso.enviadas },
    };
  }

  if (entrada.progreso.fase === "PULL") {
    return { tipo: "SINCRONIZANDO", progreso: null };
  }

  if (entrada.conflictos.length > 0) {
    // Se cuenta y se lista por registro afectado, no por operación: al odontólogo le importa
    // "qué fichas tengo que revisar", no cuántos envíos fallaron.
    return {
      tipo: "CONFLICTO",
      entidades: agruparPorRegistro(entrada.conflictos, entrada.nombresPorPacienteId ?? {}),
    };
  }

  return { tipo: "AL_DIA", ultimaSincronizacion: entrada.ultimaSincronizacion };
}

/** Porcentaje a mostrar durante el push (FR-004). Nunca pasa de 100 ni divide por cero. */
export function porcentajeDe(progreso: { total: number; enviadas: number }): number {
  if (progreso.total <= 0) return 100;
  return Math.min(100, Math.round((progreso.enviadas / progreso.total) * 100));
}
