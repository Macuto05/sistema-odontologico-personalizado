import { NextResponse } from "next/server";
import { ArchivoEstudioRepositoryPrisma } from "@/infrastructure/db/prisma/ArchivoEstudioRepositoryPrisma";
import { TipoArchivoEstudio } from "@/domain/entities/Cita";
import { AlmacenamientoNoDisponibleError } from "@/infrastructure/storage/supabase/archivosStorage";

const repo = new ArchivoEstudioRepositoryPrisma();

type Contexto = { params: Promise<{ id: string; estudioItemId: string; archivoId: string }> };

const CONTENT_TYPE: Record<TipoArchivoEstudio, string> = {
  IMAGEN: "image/*",
  PDF: "application/pdf",
};

/**
 * GET /api/citas/[id]/estudios/[estudioItemId]/archivos/[archivoId] —
 * contracts/archivos-estudio-api.md. Requiere conexión igual que subirlo (research.md
 * #14) — el contenido nunca se guarda en IndexedDB. Control de acceso a nivel de
 * registro (Principio VII): el archivo debe pertenecer exactamente a esta Cita y este
 * Estudio, no solo existir con ese id.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { id, estudioItemId, archivoId } = await params;

  let archivo;
  try {
    archivo = await repo.obtenerContenido(id, estudioItemId, archivoId);
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
