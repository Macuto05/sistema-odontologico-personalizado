/**
 * Entidad de dominio Odontograma (006-odontograma). Sin dependencias de framework
 * (Principio II). Ver specs/006-odontograma/data-model.md.
 */

import { ConflictoPendiente } from "./Paciente";

export type Denticion = "ADULTO" | "NINO";

export type Superficie =
  | "MESIAL"
  | "DISTAL"
  | "VESTIBULAR"
  | "PALATINO_LINGUAL"
  | "OCLUSAL_INCISAL";

export type EstadoColor = "PENDIENTE" | "REALIZADO";

/** Hallazgo embebido en Odontograma.hallazgos — data-model.md §HallazgoDental. */
export interface HallazgoDental {
  id: string;
  condicionId: string;
  dientes: string[];
  superficie: Superficie | null;
  variante: string | null;
  estadoColor: EstadoColor | null;
  nota: string | null;
  registradoEn: string;
}

/** Nota libre embebida en Odontograma.notas — a diferencia de `HallazgoDental.nota`, no
 * depende de que exista ninguna condición: un diente (o diente+superficie) puede tener una
 * nota sin ningún hallazgo. A lo sumo una por contexto de selección (diente, superficie). */
export interface NotaDental {
  id: string;
  diente: string;
  superficie: Superficie | null;
  texto: string;
  registradoEn: string;
}

export interface Odontograma {
  id: string;
  pacienteId: string;
  denticion: Denticion;
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
  version: number;
  conflictoPendiente: ConflictoPendiente | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatosNuevoOdontograma {
  id: string;
  pacienteId: string;
  denticion: Denticion;
}

export interface DatosEdicionOdontograma {
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
  /** version del Odontograma sobre la que se basó esta edición — detección de conflicto. */
  baseVersion: number;
}

export interface ResultadoEdicionOdontograma {
  odontograma: Odontograma;
  /** true si baseVersion no coincidía con la version del servidor al momento de aplicar. */
  conflicto: boolean;
}

/** Crea un Odontograma vacío sin persistirlo — se usa la primera vez que se necesita, sin
 * acción explícita del usuario (research.md #10). */
export function crearOdontogramaVacio(datos: DatosNuevoOdontograma): Odontograma {
  const ahora = new Date().toISOString();
  return {
    id: datos.id,
    pacienteId: datos.pacienteId,
    denticion: datos.denticion,
    hallazgos: [],
    notas: [],
    version: 1,
    conflictoPendiente: null,
    createdAt: ahora,
    updatedAt: ahora,
  };
}
