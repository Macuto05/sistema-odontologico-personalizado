import { Paciente } from "./entities/Paciente";
import { Consultorio } from "./entities/Consultorio";

/** FR-004 / FR-007: documento de identidad ya usado por otro paciente (activo o archivado). */
export class DocumentoDuplicadoError extends Error {
  constructor(public readonly pacienteExistente: Paciente) {
    super("DOCUMENTO_DUPLICADO");
    this.name = "DocumentoDuplicadoError";
  }
}

/** 004-consultorios, FR-003: ya existe un consultorio con este nombre (insensible a mayúsculas). */
export class NombreConsultorioDuplicadoError extends Error {
  constructor(public readonly consultorioExistente: Consultorio) {
    super("NOMBRE_DUPLICADO");
    this.name = "NombreConsultorioDuplicadoError";
  }
}

/** FR-008: un paciente archivado no admite edición directa. */
export class PacienteArchivadoError extends Error {
  constructor() {
    super("PACIENTE_ARCHIVADO");
    this.name = "PacienteArchivadoError";
  }
}

export class PacienteNoEncontradoError extends Error {
  constructor(id: string) {
    super(`PACIENTE_NO_ENCONTRADO: ${id}`);
    this.name = "PacienteNoEncontradoError";
  }
}

/** Reactivar un paciente que ya está activo. */
export class PacienteNoEstaArchivadoError extends Error {
  constructor() {
    super("PACIENTE_NO_ARCHIVADO");
    this.name = "PacienteNoEstaArchivadoError";
  }
}

/** 010-gestion-insumos, FR-012: un insumo archivado no admite edición directa. */
export class InsumoArchivadoError extends Error {
  constructor() {
    super("INSUMO_ARCHIVADO");
    this.name = "InsumoArchivadoError";
  }
}

export class InsumoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`INSUMO_NO_ENCONTRADO: ${id}`);
    this.name = "InsumoNoEncontradoError";
  }
}

/** 010-gestion-insumos: reactivar un insumo que ya está activo. */
export class InsumoNoEstaArchivadoError extends Error {
  constructor() {
    super("INSUMO_NO_ARCHIVADO");
    this.name = "InsumoNoEstaArchivadoError";
  }
}

/** FR-014: la contraseña actual ingresada no coincide con la guardada. */
export class PasswordActualIncorrectaError extends Error {
  constructor() {
    super("PASSWORD_ACTUAL_INCORRECTA");
    this.name = "PasswordActualIncorrectaError";
  }
}

/**
 * 005-atencion-paciente, FR-015/FR-016: una cita finalizada es inmutable salvo adjuntar
 * archivos a un estudio existente (FR-017, que no pasa por esta validación).
 */
export class CitaFinalizadaError extends Error {
  constructor() {
    super("CITA_FINALIZADA");
    this.name = "CitaFinalizadaError";
  }
}

export class CitaNoEncontradaError extends Error {
  constructor(id: string) {
    super(`CITA_NO_ENCONTRADA: ${id}`);
    this.name = "CitaNoEncontradaError";
  }
}

/** FR-017: el estudioItemId indicado no existe dentro de Cita.estudioItems. */
export class EstudioNoEncontradoError extends Error {
  constructor() {
    super("ESTUDIO_NO_ENCONTRADO");
    this.name = "EstudioNoEncontradoError";
  }
}

/** FR-018: solo se aceptan imágenes o PDF como adjunto de resultado de un estudio. */
export class TipoArchivoNoSoportadoError extends Error {
  constructor() {
    super("TIPO_NO_SOPORTADO");
    this.name = "TipoArchivoNoSoportadoError";
  }
}

/** 012-archivos-supabase-storage, FR-010: el archivo supera TAMANO_MAXIMO_ARCHIVO_BYTES. */
export class ArchivoDemasiadoGrandeError extends Error {
  constructor() {
    super("ARCHIVO_DEMASIADO_GRANDE");
    this.name = "ArchivoDemasiadoGrandeError";
  }
}

/** Pestaña Archivos de la ficha: el archivo indicado no existe o no pertenece a ese paciente. */
export class ArchivoPacienteNoEncontradoError extends Error {
  constructor() {
    super("ARCHIVO_NO_ENCONTRADO");
    this.name = "ArchivoPacienteNoEncontradoError";
  }
}

/** 006-odontograma: el Odontograma indicado (por id, o por pacienteId+denticion) no existe. */
export class OdontogramaNoEncontradoError extends Error {
  constructor(referencia: string) {
    super(`ODONTOGRAMA_NO_ENCONTRADO: ${referencia}`);
    this.name = "OdontogramaNoEncontradoError";
  }
}

/** 006-odontograma: el ItemPlanTratamiento indicado no existe. */
export class ItemPlanTratamientoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`ITEM_PLAN_TRATAMIENTO_NO_ENCONTRADO: ${id}`);
    this.name = "ItemPlanTratamientoNoEncontradoError";
  }
}

/** 006-odontograma: condicionId inexistente en el catálogo, o combinación inválida de
 * superficie/variante/dientes para la condición indicada (data-model.md §Validaciones). */
export class CondicionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "CondicionInvalidaError";
  }
}

/** 006-odontograma, research.md #4: CambioOdontograma es append-only — se rechaza
 * cualquier intento de editarlo o eliminarlo. */
export class CambioOdontogramaInmutableError extends Error {
  constructor() {
    super("CAMBIO_ODONTOGRAMA_INMUTABLE");
    this.name = "CambioOdontogramaInmutableError";
  }
}
