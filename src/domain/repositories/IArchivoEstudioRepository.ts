import { ArchivoEstudio, DatosNuevoArchivoEstudio } from "../entities/ArchivoEstudio";
import { Cita } from "../entities/Cita";

export interface ResultadoAgregarArchivoEstudio {
  archivo: ArchivoEstudio;
  /** La Cita completa, ya actualizada — el cliente la persiste directo (Principio VIII). */
  cita: Cita;
}

/**
 * Puerto de dominio (Principio II) — única implementación: ArchivoEstudioRepositoryPrisma.
 * Sin contraparte Dexie: es online-only por decisión del spec (FR-019), mismo patrón que
 * `IUsuarioRepository` (research.md #5).
 */
export interface IArchivoEstudioRepository {
  /** Lanza EstudioNoEncontradoError si estudioItemId no existe en Cita.estudioItems. */
  agregar(datos: DatosNuevoArchivoEstudio): Promise<ResultadoAgregarArchivoEstudio>;
  /** `null` si el archivo no existe o no pertenece a ese citaId/estudioItemId (Principio VII). */
  obtenerContenido(
    citaId: string,
    estudioItemId: string,
    archivoId: string,
  ): Promise<ArchivoEstudio | null>;
}
