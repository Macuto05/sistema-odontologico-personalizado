/**
 * Entidad de dominio Cita (005-atencion-paciente). Sin dependencias de framework
 * (Principio II). Ver specs/005-atencion-paciente/data-model.md para la definición
 * completa.
 */

import { ConflictoPendiente } from "./Paciente";

export type EstadoCita = "EN_CURSO" | "FINALIZADA";

/** Catálogo fijo de tipo de consulta (FR-006, research.md #12). */
export type CategoriaConsulta =
  | "CONTROL"
  | "URGENCIA"
  | "LIMPIEZA_PROFILAXIS"
  | "ENDODONCIA"
  | "EXTRACCION"
  | "RESTAURACION_OBTURACION"
  | "ORTODONCIA"
  | "CIRUGIA"
  | "CONSULTA_GENERAL"
  | "OTRO";

export type TipoArchivoEstudio = "IMAGEN" | "PDF";

/** Ítem embebido de Cita.recetaItems — research.md #2. */
export interface ItemReceta {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string | null;
}

/**
 * Metadata liviana de un archivo adjunto — nunca incluye el contenido binario (eso vive
 * solo en el servidor, ver domain/entities/ArchivoEstudio.ts y research.md #3, #4, #14).
 */
export interface ArchivoEstudioMeta {
  id: string;
  nombreArchivo: string;
  tipo: TipoArchivoEstudio;
  createdAt: string;
}

/** Ítem embebido de Cita.estudioItems — research.md #2. `archivos` es derivado (#3).
 * `motivo` (indicación clínica) es opcional, agregado en el rediseño visual posterior. */
export interface EstudioItem {
  id: string;
  nombre: string;
  motivo: string | null;
  archivos: ArchivoEstudioMeta[];
}

export interface Cita {
  id: string;
  pacienteId: string;
  estado: EstadoCita;
  categoria: CategoriaConsulta | null;
  motivoConsulta: string | null;
  diagnostico: string | null;
  recetaItems: ItemReceta[];
  estudioItems: EstudioItem[];
  version: number;
  conflictoPendiente: ConflictoPendiente | null;
  /** `null` mientras está en curso; se completa al finalizar (FR-014). */
  finalizadaEn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatosNuevaCita {
  id: string;
  pacienteId: string;
}

export interface DatosEdicionCita {
  categoria?: CategoriaConsulta | null;
  motivoConsulta?: string | null;
  diagnostico?: string | null;
  recetaItems?: ItemReceta[];
  estudioItems?: EstudioItem[];
  /** version de la cita sobre la que se basó esta edición — detección de conflicto. */
  baseVersion: number;
}

export interface ResultadoEdicionCita {
  cita: Cita;
  /** true si baseVersion no coincidía con la version del servidor al momento de aplicar. */
  conflicto: boolean;
}

/** Construye una Cita nueva en estado EN_CURSO, version 1 — sin persistirla (FR-002). */
export function crearCitaDesdeDatos(datos: DatosNuevaCita): Cita {
  const ahora = new Date().toISOString();
  return {
    id: datos.id,
    pacienteId: datos.pacienteId,
    estado: "EN_CURSO",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: null,
    createdAt: ahora,
    updatedAt: ahora,
  };
}

/** FR-015: una cita finalizada no admite edición de diagnóstico/receta/estudios. */
export function puedeEditarseCita(cita: Cita): boolean {
  return cita.estado === "EN_CURSO";
}
