import { NextResponse } from "next/server";
import { ArchivoPacienteRepositoryPrisma } from "@/infrastructure/db/prisma/ArchivoPacienteRepositoryPrisma";
import { ArchivoPacienteNoEncontradoError } from "@/domain/errors";
import { AlmacenamientoNoDisponibleError } from "@/infrastructure/storage/supabase/archivosStorage";
import { TipoArchivoEstudio } from "@/domain/entities/Cita";

const repo = new ArchivoPacienteRepositoryPrisma();

type Contexto = { params: Promise<{ id: string; archivoId: string }> };

const CONTENT_TYPE: Record<TipoArchivoEstudio, string> = {
  IMAGEN: "image/*",
  PDF: "application/pdf",
};

/**
 * GET /api/patients/[id]/archivos/[archivoId] — descarga el binario. Requiere conexión,
 * el contenido nunca se guarda en IndexedDB (mismo criterio que archivos de estudio).
 * Control de acceso a nivel de registro (Principio VII): el archivo debe pertenecer
 * exactamente a este paciente, no solo existir con ese id.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { id, archivoId } = await params;

  let archivo;
  try {
    archivo = await repo.obtenerContenido(id, archivoId);
  } catch (err) {
    // El registro existe pero el almacenamiento no respondió: 502, nunca 404 — un 404 le
    // diría al odontólogo que el archivo no existe, cuando en realidad sigue ahí
    // (012-archivos-supabase-storage research.md #4).
    if (err instanceof AlmacenamientoNoDisponibleError) {
      return NextResponse.json({ error: "ALMACENAMIENTO_NO_DISPONIBLE" }, { status: 502 });
    }
    throw err;
  }

  if (!archivo) {
    return NextResponse.json({ error: "ARCHIVO_NO_ENCONTRADO" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(archivo.contenido), {
    status: 200,
    headers: {
      "Content-Type":
        archivo.tipo === "IMAGEN" ? guessImageType(archivo.nombreArchivo) : CONTENT_TYPE[archivo.tipo],
      "Content-Disposition": `inline; filename="${archivo.nombreArchivo}"`,
    },
  });
}

/** DELETE /api/patients/[id]/archivos/[archivoId] — elimina un archivo del paciente. */
export async function DELETE(_request: Request, { params }: Contexto) {
  const { id, archivoId } = await params;

  try {
    await repo.eliminar(id, archivoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ArchivoPacienteNoEncontradoError) {
      return NextResponse.json({ error: "ARCHIVO_NO_ENCONTRADO" }, { status: 404 });
    }
    // Storage no respondió: la fila NO se borró (research.md #3), así que el archivo sigue
    // completo y el odontólogo puede reintentar.
    if (err instanceof AlmacenamientoNoDisponibleError) {
      return NextResponse.json({ error: "ALMACENAMIENTO_NO_DISPONIBLE" }, { status: 502 });
    }
    throw err;
  }
}

/** El tipo `IMAGEN` cubre cualquier `image/*` — se afina el Content-Type real por
 * extensión para que el navegador lo muestre bien, sin guardar el MIME exacto aparte. */
function guessImageType(nombreArchivo: string): string {
  const extension = nombreArchivo.split(".").pop()?.toLowerCase();
  const porExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return (extension && porExtension[extension]) || "application/octet-stream";
}
