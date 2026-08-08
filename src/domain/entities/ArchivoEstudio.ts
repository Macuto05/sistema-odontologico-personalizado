/**
 * Entidad de dominio ArchivoEstudio (005-atencion-paciente) — solo servidor, sin
 * contraparte en Dexie (research.md #3, #5): a diferencia de Cita, esta operación no es
 * local-first por decisión explícita del spec (FR-019). El contenido binario nunca cruza
 * al cliente salvo en la descarga puntual de un archivo (research.md #14).
 */

import { TipoArchivoEstudio } from "./Cita";

export interface ArchivoEstudio {
  id: string;
  citaId: string;
  /** Referencia al `id` de un elemento dentro de Cita.estudioItems (research.md #3). */
  estudioItemId: string;
  nombreArchivo: string;
  tipo: TipoArchivoEstudio;
  contenido: Uint8Array;
  createdAt: string;
}

export interface DatosNuevoArchivoEstudio {
  citaId: string;
  estudioItemId: string;
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
