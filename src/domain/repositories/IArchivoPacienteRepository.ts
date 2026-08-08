import {
  ArchivoPaciente,
  ArchivoPacienteMeta,
  DatosNuevoArchivoPaciente,
} from "../entities/ArchivoPaciente";

/**
 * Puerto de dominio (Principio II) — única implementación: ArchivoPacienteRepositoryPrisma.
 * Sin contraparte Dexie: online-only, mismo patrón que IArchivoEstudioRepository.
 */
export interface IArchivoPacienteRepository {
  /** Lanza PacienteNoEncontradoError si pacienteId no existe. */
  agregar(datos: DatosNuevoArchivoPaciente): Promise<ArchivoPaciente>;
  /** Metadata sin el binario, más reciente primero. */
  listar(pacienteId: string): Promise<ArchivoPacienteMeta[]>;
  /** `null` si el archivo no existe o no pertenece a ese pacienteId (Principio VII). */
  obtenerContenido(pacienteId: string, archivoId: string): Promise<ArchivoPaciente | null>;
  /** Lanza ArchivoPacienteNoEncontradoError si no existe o no pertenece a ese pacienteId. */
  eliminar(pacienteId: string, archivoId: string): Promise<void>;
}
