"use client";

import { useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, CLAVE_ULTIMA_SINCRONIZACION_GENERAL, EstadoOutbox } from "@/infrastructure/db/dexie/db";
import {
  obtenerProgreso,
  obtenerProgresoServidor,
  suscribirProgreso,
} from "@/infrastructure/sync/syncStatus";
import { derivarEstadoSync, EstadoSyncUI } from "@/infrastructure/sync/derivarEstadoSync";

/**
 * Estado del indicador de sincronización — 011-indicador-sincronizacion.
 *
 * Junta las cuatro fuentes que ya existen o que agrega esta feature (data-model.md) y las
 * pasa por `derivarEstadoSync` (que es donde vive la prioridad entre estados, FR-009). Este
 * hook no decide nada: solo observa. Todo es reactivo — `useLiveQuery` sobre Dexie y eventos
 * nativos del navegador — sin ningún polling ni llamada de red nueva (Principio VIII).
 */

const ESTADOS_SIN_CONFIRMAR: EstadoOutbox[] = ["PENDIENTE", "ENVIANDO"];

// --- Conectividad: store a nivel de módulo, no un useState por componente ---------------
// `navigator.onLine` no existe en el servidor, y los listeners son globales: un store
// compartido evita registrar un par de listeners por cada instancia montada del indicador
// (hay dos puntos de montaje posibles, research.md #7).

type Listener = () => void;

function suscribirConectividad(listener: Listener): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function obtenerConectividad(): boolean {
  return navigator.onLine;
}

// En SSR se asume "con conexión": es el estado más común y evita un parpadeo de "Sin
// conexión" en la primera pintura, que además sería falso para casi todos los renders.
function obtenerConectividadServidor(): boolean {
  return true;
}

export function useSyncStatus(): EstadoSyncUI {
  const online = useSyncExternalStore(
    suscribirConectividad,
    obtenerConectividad,
    obtenerConectividadServidor,
  );

  const progreso = useSyncExternalStore(
    suscribirProgreso,
    obtenerProgreso,
    obtenerProgresoServidor,
  );

  // `estado` está indexado en `outboxOperations` (v4 del esquema Dexie) — este count no
  // recorre la tabla entera.
  const pendientes = useLiveQuery(
    () => db.outboxOperations.where("estado").anyOf(ESTADOS_SIN_CONFIRMAR).count(),
    [],
    0,
  );

  const conflictos = useLiveQuery(
    () => db.outboxOperations.where("estado").equals("CONFLICTO").toArray(),
    [],
    [],
  );

  const ultimaSincronizacion = useLiveQuery(
    () =>
      db.metaSync
        .get(CLAVE_ULTIMA_SINCRONIZACION_GENERAL)
        .then((fila) => fila?.valor ?? null),
    [],
    null,
  );

  // Un odontograma o una cita en conflicto no tienen nombre propio que mostrar; lo que los
  // hace identificables es de qué paciente son. Se resuelve contra la base local (sin red), y
  // solo para los pacientes que efectivamente aparecen en la lista de conflictos — que es
  // corta por definición, no toda la tabla (Principio VIII).
  const idsPacientesEnConflicto = [
    ...new Set(
      conflictos
        .map((operacion) => {
          const payload = operacion.payload;
          if (!payload || typeof payload !== "object") return null;
          const pacienteId = (payload as Record<string, unknown>).pacienteId;
          return typeof pacienteId === "string" ? pacienteId : null;
        })
        .filter((id): id is string => id !== null),
    ),
  ].sort();

  const nombresPorPacienteId = useLiveQuery(
    async () => {
      if (idsPacientesEnConflicto.length === 0) return {};
      const pacientes = await db.pacientes.bulkGet(idsPacientesEnConflicto);
      return Object.fromEntries(
        pacientes
          .filter((paciente) => paciente !== undefined)
          .map((paciente) => [paciente.id, paciente.nombreCompleto]),
      );
    },
    // Se depende de la lista serializada, no del array: `useLiveQuery` compara por identidad
    // y un array nuevo en cada render reejecutaría la consulta indefinidamente.
    [idsPacientesEnConflicto.join(",")],
    {},
  );

  return derivarEstadoSync({
    online,
    pendientes,
    conflictos,
    progreso,
    ultimaSincronizacion,
    nombresPorPacienteId,
  });
}
