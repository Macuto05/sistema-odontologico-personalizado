import {
  AntecedentePatologico,
  DatosNuevoPaciente,
  EstadoCivil,
  Genero,
  Paciente,
} from "../entities/Paciente";

export interface OpcionesBusquedaPacientes {
  /** Coincidencia parcial (nombre, insensible a mayúsculas) o exacta (documento). FR-005. */
  q?: string;
  /** Default "ACTIVO" — FR-006. */
  estado?: "ACTIVO" | "ARCHIVADO" | "TODOS";
  /** Base 1. Default 1 — research.md #11 (paginación de pantalla, en lotes). */
  pagina?: number;
  /** Default 10. También usado por el motor de sync con lotes más grandes (research.md #12). */
  limite?: number;
  /**
   * Timestamp ISO — solo devuelve pacientes con updatedAt > desde. Pensado para el pull
   * incremental del motor de sync (research.md #12), no para la búsqueda de la pantalla.
   */
  desde?: string;
  /** Filtro "Filtros" del listado (007-representante-menor) — ambos inclusive. */
  edadMin?: number;
  edadMax?: number;
  /**
   * Filtro por consultorio: `undefined` no filtra, `null` filtra "sin consultorio", un id
   * filtra ese consultorio puntual.
   */
  consultorioId?: string | null;
}

export interface ResultadoBusquedaPacientes {
  pacientes: Paciente[];
  /** Total de registros que matchean los filtros, sin paginar — para "Mostrando X de Y". */
  total: number;
}

export interface DatosEdicionPaciente {
  nombreCompleto: string;
  documentoIdentidad: string | null;
  fechaNacimiento: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  genero?: Genero | null;
  estadoCivil?: EstadoCivil | null;
  ocupacion?: string | null;
  antecedentesPatologicos?: AntecedentePatologico[];
  antecedentesPatologicosOtros?: string[];
  antecedentesHeredofamiliares?: string[];
  medicamentosActuales?: string[];
  alergias?: string[];
  /** 004-consultorios, FR-007. `null`/ausente quita el consultorio asignado. */
  consultorioId?: string | null;
  representanteNombre?: string | null;
  representanteCedula?: string | null;
  /** version del paciente sobre la que se basó esta edición — detección de conflicto. */
  baseVersion: number;
}

export interface ResultadoEdicion {
  paciente: Paciente;
  /** true si baseVersion no coincidía con la version del servidor al momento de aplicar. */
  conflicto: boolean;
}

export interface ResultadoArchivado {
  paciente: Paciente;
  yaEstabaArchivado: boolean;
}

/**
 * Puerto de dominio (Principio II) — implementado por PacienteRepositoryPrisma (servidor)
 * y PacienteRepositoryDexie (cliente, local-first). Los casos de uso solo conocen esta
 * interfaz, nunca la implementación concreta.
 */
export interface IPacienteRepository {
  crear(datos: DatosNuevoPaciente): Promise<Paciente>;
  buscar(opciones: OpcionesBusquedaPacientes): Promise<ResultadoBusquedaPacientes>;
  obtenerPorId(id: string): Promise<Paciente | null>;
  obtenerPorDocumento(documentoIdentidad: string): Promise<Paciente | null>;
  editar(id: string, datos: DatosEdicionPaciente): Promise<ResultadoEdicion>;
  archivar(id: string): Promise<ResultadoArchivado>;
  reactivar(id: string): Promise<Paciente>;
}
