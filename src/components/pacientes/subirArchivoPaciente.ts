import { hayOperacionesPendientes } from "@/infrastructure/sync/outboxQueue";
import { sincronizarLote } from "@/infrastructure/sync/syncEngine";

export interface ResultadoSubirArchivoPaciente {
  ok: boolean;
  error?: string;
}

/** Vacía el outbox antes de subir — el paciente puede haberse creado offline y todavía no
 * ser conocido por el servidor; mismo motivo y mismo patrón que subirArchivoEstudio. */
async function drenarPendientes(maxIntentos = 10): Promise<void> {
  for (let i = 0; i < maxIntentos && (await hayOperacionesPendientes()); i++) {
    await sincronizarLote();
  }
}

/**
 * Sube un archivo suelto a la pestaña Archivos de la ficha — llamada directa al servidor,
 * fuera del outbox. Requiere conexión: se corta antes de intentarlo si el navegador ya
 * sabe que está offline, y cualquier falla de red a mitad de camino se informa.
 */
export async function subirArchivoPaciente(
  pacienteId: string,
  archivo: File,
): Promise<ResultadoSubirArchivoPaciente> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, error: "Esta acción requiere conexión a internet." };
  }

  await drenarPendientes();

  const formData = new FormData();
  formData.set("archivo", archivo);

  try {
    const respuesta = await fetch(`/api/patients/${pacienteId}/archivos`, {
      method: "POST",
      body: formData,
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      if (cuerpo?.error === "TIPO_NO_SOPORTADO") {
        return { ok: false, error: "Solo se aceptan imágenes o archivos PDF." };
      }
      if (cuerpo?.error === "ARCHIVO_DEMASIADO_GRANDE") {
        return { ok: false, error: "El archivo es demasiado grande (máximo 20 MB)." };
      }
      if (cuerpo?.error === "ALMACENAMIENTO_NO_DISPONIBLE") {
        return { ok: false, error: "El almacenamiento no respondió. Intentá de nuevo en un momento." };
      }
      return { ok: false, error: "No se pudo subir el archivo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo subir el archivo. Verifica tu conexión." };
  }
}
