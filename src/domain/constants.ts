/**
 * Constantes de dominio compartidas entre casos de uso.
 */

/**
 * 012-archivos-supabase-storage, FR-010. Tamaño máximo aceptado para un archivo adjunto
 * (ArchivoPaciente y ArchivoEstudio). 20 MB cubre con margen radiografías digitales,
 * imágenes de alta resolución y PDFs de historia clínica — ver spec.md §Assumptions.
 * El bucket de Supabase Storage tiene el mismo límite configurado, pero la validación
 * vive acá para rechazar antes de tocar la red (y para que el error sea de dominio, no
 * de infraestructura).
 */
export const TAMANO_MAXIMO_ARCHIVO_BYTES = 20 * 1024 * 1024;
