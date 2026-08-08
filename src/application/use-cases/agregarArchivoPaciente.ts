import { IArchivoPacienteRepository } from "@/domain/repositories/IArchivoPacienteRepository";
import { ArchivoPaciente } from "@/domain/entities/ArchivoPaciente";
import { TipoArchivoEstudio } from "@/domain/entities/Cita";
import { ArchivoDemasiadoGrandeError, TipoArchivoNoSoportadoError } from "@/domain/errors";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/domain/constants";

export interface DatosCrudosArchivoPaciente {
  pacienteId: string;
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
 * Caso de uso: subir un archivo suelto a la pestaña Archivos de la ficha. Resuelve el
 * tipo (IMAGEN/PDF) a partir del Content-Type recibido y rechaza cualquier otro, y todo lo
 * que supere el tamaño máximo (FR-010), antes de tocar el repositorio — así una subida
 * inválida nunca llega a Supabase Storage. Mismo criterio que agregarArchivoEstudio.
 */
export async function agregarArchivoPaciente(
  repo: IArchivoPacienteRepository,
  datos: DatosCrudosArchivoPaciente,
): Promise<ArchivoPaciente> {
  const tipo = resolverTipo(datos.tipoMime);
  if (datos.contenido.length > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    throw new ArchivoDemasiadoGrandeError();
  }
  return repo.agregar({
    pacienteId: datos.pacienteId,
    nombreArchivo: datos.nombreArchivo,
    tipo,
    tipoMime: datos.tipoMime,
    contenido: datos.contenido,
  });
}
