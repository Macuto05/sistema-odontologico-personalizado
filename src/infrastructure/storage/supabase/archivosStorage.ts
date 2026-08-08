/**
 * Wrappers finos sobre Supabase Storage para el contenido binario de ArchivoPaciente y
 * ArchivoEstudio (012-archivos-supabase-storage). Sin lógica de dominio: solo arma la
 * clave del objeto y traduce el resultado del SDK a excepción o valor.
 *
 * Solo servidor — importa el cliente con service-role key. Nunca importar desde el
 * cliente/navegador (spec FR-007).
 */

import { supabaseStorage } from "./client";

/** Bucket único y privado para ambas entidades — research.md #1. */
export const BUCKET_ARCHIVOS = "archivos-clinicos";

/**
 * Fallo de infraestructura al hablar con Storage (red, timeout, bucket inaccesible). No es
 * un error de dominio: se mantiene fuera de `domain/errors.ts` a propósito (research.md #4,
 * Principio II) para no mezclar reglas de negocio con detalles del proveedor.
 */
export class AlmacenamientoNoDisponibleError extends Error {
  constructor(operacion: string, detalle: string) {
    super(`ALMACENAMIENTO_NO_DISPONIBLE: ${operacion} — ${detalle}`);
    this.name = "AlmacenamientoNoDisponibleError";
  }
}

/** Clave derivada del `id` del registro, sin columna extra — research.md #2. */
export function claveArchivoPaciente(pacienteId: string, archivoId: string): string {
  return `pacientes/${pacienteId}/${archivoId}`;
}

/** Clave derivada del `id` del registro, sin columna extra — research.md #2. */
export function claveArchivoEstudio(
  citaId: string,
  estudioItemId: string,
  archivoId: string,
): string {
  return `estudios/${citaId}/${estudioItemId}/${archivoId}`;
}

export async function subirArchivo(
  clave: string,
  contenido: Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await supabaseStorage.storage
    .from(BUCKET_ARCHIVOS)
    .upload(clave, contenido, { contentType });
  if (error) throw new AlmacenamientoNoDisponibleError("subir", error.message);
}

export async function leerArchivo(clave: string): Promise<Uint8Array> {
  const { data, error } = await supabaseStorage.storage.from(BUCKET_ARCHIVOS).download(clave);
  if (error || !data) {
    throw new AlmacenamientoNoDisponibleError("leer", error?.message ?? "sin contenido");
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function borrarArchivo(clave: string): Promise<void> {
  const { error } = await supabaseStorage.storage.from(BUCKET_ARCHIVOS).remove([clave]);
  if (error) throw new AlmacenamientoNoDisponibleError("borrar", error.message);
}
