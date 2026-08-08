/**
 * Entidad de dominio ItemPlanTratamiento (006-odontograma) — línea del plan de tratamiento
 * estructurado, independiente de Odontograma/Denticion (research.md #5). Sin dependencias
 * de framework (Principio II).
 *
 * `fechaRealizado`/`nota` (009-planes-tratamiento): únicos dos campos editables desde la
 * pestaña "Planes" — `fecha`/`diente`/`tratamiento` y la eliminación siguen siendo
 * exclusivos del tab Odontograma (data-model.md de 009-planes-tratamiento).
 */

import { ConflictoPendiente } from "./Paciente";

export interface ItemPlanTratamiento {
  id: string;
  pacienteId: string;
  fecha: string;
  diente: string | null;
  tratamiento: string;
  /** `null` mientras está pendiente. Se completa/vacía únicamente a través del checkbox
   * "Realizado" (`marcarRealizadoItemPlanTratamiento`) — nunca recibida como dato libre. */
  fechaRealizado: string | null;
  /** Texto libre opcional, editable desde la pestaña Planes. */
  nota: string | null;
  version: number;
  conflictoPendiente: ConflictoPendiente | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatosNuevoItemPlanTratamiento {
  id: string;
  pacienteId: string;
  fecha: string;
  diente?: string | null;
  tratamiento: string;
}

export interface DatosEdicionItemPlanTratamiento {
  fecha?: string;
  diente?: string | null;
  tratamiento?: string;
  fechaRealizado?: string | null;
  nota?: string | null;
  baseVersion: number;
}

/** Crea un ItemPlanTratamiento nuevo, version 1 — sin persistirlo. `fechaRealizado`/`nota`
 * nacen en `null`: un plan recién cargado desde Odontograma siempre arranca pendiente y sin
 * nota (009-planes-tratamiento). */
export function crearItemPlanTratamientoDesdeDatos(
  datos: DatosNuevoItemPlanTratamiento,
): ItemPlanTratamiento {
  const ahora = new Date().toISOString();
  return {
    id: datos.id,
    pacienteId: datos.pacienteId,
    fecha: datos.fecha,
    diente: datos.diente ?? null,
    tratamiento: datos.tratamiento,
    fechaRealizado: null,
    nota: null,
    version: 1,
    conflictoPendiente: null,
    createdAt: ahora,
    updatedAt: ahora,
  };
}
