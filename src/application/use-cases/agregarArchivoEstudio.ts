import {
  IArchivoEstudioRepository,
  ResultadoAgregarArchivoEstudio,
} from "@/domain/repositories/IArchivoEstudioRepository";
import { TipoArchivoEstudio } from "@/domain/entities/Cita";
import { ArchivoDemasiadoGrandeError, TipoArchivoNoSoportadoError } from "@/domain/errors";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/domain/constants";

export interface DatosCrudosArchivoEstudio {
  citaId: string;
  estudioItemId: string;
  nombreArchivo: string;
  /** Content-Type recibido en la subida — se resuelve a IMAGEN/PDF acá, no en el repositorio. */
  tipoMime: string;
  contenido: Uint8Array;
}

function resolverTipo(tipoMime: string): TipoArchivoEstudio {
  if (tipoMime.startsWith("image/")) return "IMAGEN";
  if (tipoMime === "application/pdf") return "PDF";
  throw new TipoArchivoNoSoportadoError();
}

/**
 * Caso de uso: adjuntar un archivo de resultado a un estudio (US8, FR-017 a FR-019).
 * Resuelve el tipo (IMAGEN/PDF) a partir del Content-Type recibido y rechaza cualquier
 * otro (FR-018), y todo lo que supere el tamaño máximo (012-archivos-supabase-storage
 * FR-010), antes de tocar el repositorio — así una subida inválida nunca llega a Supabase
 * Storage. Funciona igual si la Cita ya está finalizada, es la única excepción a ese
 * bloqueo (research.md #3, #10).
 */
export async function agregarArchivoEstudio(
  repo: IArchivoEstudioRepository,
  datos: DatosCrudosArchivoEstudio,
): Promise<ResultadoAgregarArchivoEstudio> {
  const tipo = resolverTipo(datos.tipoMime);
  if (datos.contenido.length > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    throw new ArchivoDemasiadoGrandeError();
  }
  return repo.agregar({
    citaId: datos.citaId,
    estudioItemId: datos.estudioItemId,
    nombreArchivo: datos.nombreArchivo,
    tipo,
    tipoMime: datos.tipoMime,
    contenido: datos.contenido,
  });
}
