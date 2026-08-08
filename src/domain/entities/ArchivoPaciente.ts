/**
 * Entidad de dominio ArchivoPaciente (pestaña "Archivos" de la ficha, rediseño visual
 * posterior a 005/006) — solo servidor, sin contraparte en Dexie, mismo criterio que
 * ArchivoEstudio: el contenido binario nunca cruza al cliente salvo en la descarga
 * puntual de un archivo. A diferencia de ArchivoEstudio, no cuelga de ninguna Cita.
 */

import { TipoArchivoEstudio } from "./Cita";

export interface ArchivoPaciente {
  id: string;
  pacienteId: string;
  nombreArchivo: string;
  tipo: TipoArchivoEstudio;
  tamanoBytes: number;
  contenido: Uint8Array;
  createdAt: string;
}

/** Metadata liviana, sin el binario — lo que se usa para listar (tabla de la pestaña). */
export type ArchivoPacienteMeta = Omit<ArchivoPaciente, "contenido">;

export interface DatosNuevoArchivoPaciente {
  pacienteId: string;
  nombreArchivo: string;
  tipo: TipoArchivoEstudio;
  /**
   * Content-Type original recibido en la subida (ya validado por el caso de uso). Se
   * conserva además de `tipo` porque el objeto en Supabase Storage se guarda con este
   * valor exacto — `tipo` (IMAGEN/PDF) es demasiado grueso para eso.
   */
  tipoMime: string;
  contenido: Uint8Array;
}
