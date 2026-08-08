import { NextResponse } from "next/server";
import { agregarArchivoEstudio } from "@/application/use-cases/agregarArchivoEstudio";
import { ArchivoEstudioRepositoryPrisma } from "@/infrastructure/db/prisma/ArchivoEstudioRepositoryPrisma";
import {
  ArchivoDemasiadoGrandeError,
  CitaNoEncontradaError,
  EstudioNoEncontradoError,
  TipoArchivoNoSoportadoError,
} from "@/domain/errors";
import { AlmacenamientoNoDisponibleError } from "@/infrastructure/storage/supabase/archivosStorage";

const repo = new ArchivoEstudioRepositoryPrisma();

type Contexto = { params: Promise<{ id: string; estudioItemId: string }> };

/**
 * POST /api/citas/[id]/estudios/[estudioItemId]/archivos —
 * contracts/archivos-estudio-api.md. Online-only, fuera del outbox (research.md #5);
 * funciona aunque la Cita esté finalizada (FR-017). Protegido por middleware.
 */
export async function POST(request: Request, { params }: Contexto) {
  const { id, estudioItemId } = await params;

  const formData = await request.formData();
  const archivo = formData.get("archivo");
  // Se evita `instanceof File`: en distintos entornos de ejecución (Node/undici en
  // producción, jsdom en tests) `File` puede ser una implementación distinta a la global
  // usada acá — duck-typing (Blob-like: arrayBuffer/name/type) es lo único confiable.
  if (
    !archivo ||
    typeof archivo === "string" ||
    typeof (archivo as { arrayBuffer?: unknown }).arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "VALIDACION", detalles: "Falta el archivo" }, { status: 422 });
  }
  const archivoRecibido = archivo as File;

  try {
    const contenido = new Uint8Array(await archivoRecibido.arrayBuffer());
    const { archivo: creado, cita } = await agregarArchivoEstudio(repo, {
      citaId: id,
      estudioItemId,
      nombreArchivo: archivoRecibido.name,
      tipoMime: archivoRecibido.type,
      contenido,
    });

    return NextResponse.json(
      {
        archivo: {
          id: creado.id,
          estudioItemId: creado.estudioItemId,
          nombreArchivo: creado.nombreArchivo,
          tipo: creado.tipo,
          createdAt: creado.createdAt,
        },
        cita,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof TipoArchivoNoSoportadoError) {
      return NextResponse.json({ error: "TIPO_NO_SOPORTADO" }, { status: 422 });
    }
    if (err instanceof ArchivoDemasiadoGrandeError) {
      return NextResponse.json({ error: "ARCHIVO_DEMASIADO_GRANDE" }, { status: 422 });
    }
    if (err instanceof EstudioNoEncontradoError) {
      return NextResponse.json({ error: "ESTUDIO_NO_ENCONTRADO" }, { status: 404 });
    }
    if (err instanceof CitaNoEncontradaError) {
      return NextResponse.json({ error: "CITA_NO_ENCONTRADA" }, { status: 404 });
    }
    if (err instanceof AlmacenamientoNoDisponibleError) {
      return NextResponse.json({ error: "ALMACENAMIENTO_NO_DISPONIBLE" }, { status: 502 });
    }
    throw err;
  }
}
