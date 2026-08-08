import { NextResponse } from "next/server";
import { agregarArchivoPaciente } from "@/application/use-cases/agregarArchivoPaciente";
import { ArchivoPacienteRepositoryPrisma } from "@/infrastructure/db/prisma/ArchivoPacienteRepositoryPrisma";
import {
  ArchivoDemasiadoGrandeError,
  PacienteNoEncontradoError,
  TipoArchivoNoSoportadoError,
} from "@/domain/errors";
import { AlmacenamientoNoDisponibleError } from "@/infrastructure/storage/supabase/archivosStorage";

const repo = new ArchivoPacienteRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** GET /api/patients/[id]/archivos — metadata (sin el binario) de todos los archivos del
 * paciente, más reciente primero. Usado por la pestaña Archivos de la ficha. */
export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const archivos = await repo.listar(id);
  return NextResponse.json({ archivos });
}

/**
 * POST /api/patients/[id]/archivos — sube un archivo suelto del paciente. Online-only,
 * fuera del outbox, mismo patrón que /api/citas/[id]/estudios/[estudioItemId]/archivos.
 * Protegido por middleware.
 */
export async function POST(request: Request, { params }: Contexto) {
  const { id } = await params;

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
    const creado = await agregarArchivoPaciente(repo, {
      pacienteId: id,
      nombreArchivo: archivoRecibido.name,
      tipoMime: archivoRecibido.type,
      contenido,
    });

    return NextResponse.json(
      {
        archivo: {
          id: creado.id,
          nombreArchivo: creado.nombreArchivo,
          tipo: creado.tipo,
          tamanoBytes: creado.tamanoBytes,
          createdAt: creado.createdAt,
        },
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
    if (err instanceof PacienteNoEncontradoError) {
      return NextResponse.json({ error: "PACIENTE_NO_ENCONTRADO" }, { status: 404 });
    }
    if (err instanceof AlmacenamientoNoDisponibleError) {
      return NextResponse.json({ error: "ALMACENAMIENTO_NO_DISPONIBLE" }, { status: 502 });
    }
    throw err;
  }
}
