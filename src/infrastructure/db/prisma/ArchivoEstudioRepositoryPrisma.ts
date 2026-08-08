import { randomUUID } from "crypto";
import { ArchivoEstudio as ArchivoEstudioPrisma } from "@prisma/client";
import { prisma } from "./client";
import { ArchivoEstudio, DatosNuevoArchivoEstudio } from "@/domain/entities/ArchivoEstudio";
import {
  IArchivoEstudioRepository,
  ResultadoAgregarArchivoEstudio,
} from "@/domain/repositories/IArchivoEstudioRepository";
import { CitaNoEncontradaError, EstudioNoEncontradoError } from "@/domain/errors";
import { SELECT_METADATA_ARCHIVOS, aDominioCita } from "./CitaRepositoryPrisma";
import {
  borrarArchivo,
  claveArchivoEstudio,
  leerArchivo,
  subirArchivo,
} from "@/infrastructure/storage/supabase/archivosStorage";

function aDominioArchivo(a: ArchivoEstudioPrisma, contenido: Uint8Array): ArchivoEstudio {
  return {
    id: a.id,
    citaId: a.citaId,
    estudioItemId: a.estudioItemId,
    nombreArchivo: a.nombreArchivo,
    tipo: a.tipo,
    contenido,
    createdAt: a.createdAt.toISOString(),
  };
}

/**
 * Única implementación de IArchivoEstudioRepository — online-only, sin contraparte Dexie
 * (research.md #5). Desde 012-archivos-supabase-storage la metadata vive en Postgres y el
 * contenido binario en Supabase Storage; esta clase es la costura entre ambos.
 */
export class ArchivoEstudioRepositoryPrisma implements IArchivoEstudioRepository {
  /**
   * Orden deliberado (012-archivos-supabase-storage research.md #3): se sube a Storage
   * ANTES de insertar la fila, con compensación si el insert falla — ver el gemelo en
   * ArchivoPacienteRepositoryPrisma.
   */
  async agregar(datos: DatosNuevoArchivoEstudio): Promise<ResultadoAgregarArchivoEstudio> {
    const cita = await prisma.cita.findUnique({ where: { id: datos.citaId } });
    if (!cita) throw new CitaNoEncontradaError(datos.citaId);

    const estudioItems = (cita.estudioItems as unknown as { id: string }[]) ?? [];
    const existeEstudio = estudioItems.some((item) => item.id === datos.estudioItemId);
    if (!existeEstudio) throw new EstudioNoEncontradoError();

    // El id se genera acá porque la clave del objeto en Storage se deriva de él y hay que
    // conocerla antes de subir (research.md #2).
    const id = randomUUID();
    const clave = claveArchivoEstudio(datos.citaId, datos.estudioItemId, id);

    await subirArchivo(clave, datos.contenido, datos.tipoMime);

    let creado;
    try {
      // FR-017: se permite aunque `cita.estado === "FINALIZADA"` — es la única escritura de
      // esa feature que ignora ese bloqueo (005 research.md #3, #10).
      creado = await prisma.archivoEstudio.create({
        data: {
          id,
          citaId: datos.citaId,
          estudioItemId: datos.estudioItemId,
          nombreArchivo: datos.nombreArchivo,
          tipo: datos.tipo,
        },
      });
    } catch (err) {
      await borrarArchivo(clave).catch(() => {});
      throw err;
    }

    const citaConArchivos = await prisma.cita.findUniqueOrThrow({
      where: { id: datos.citaId },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });

    return {
      archivo: aDominioArchivo(creado, datos.contenido),
      cita: aDominioCita(citaConArchivos),
    };
  }

  /**
   * Control de acceso a nivel de registro (Principio VII): la pertenencia a esa
   * citaId/estudioItemId se valida contra Postgres ANTES de tocar Storage.
   */
  async obtenerContenido(
    citaId: string,
    estudioItemId: string,
    archivoId: string,
  ): Promise<ArchivoEstudio | null> {
    const archivo = await prisma.archivoEstudio.findUnique({ where: { id: archivoId } });
    if (!archivo || archivo.citaId !== citaId || archivo.estudioItemId !== estudioItemId) {
      return null;
    }

    const contenido = await leerArchivo(claveArchivoEstudio(citaId, estudioItemId, archivoId));
    return aDominioArchivo(archivo, contenido);
  }
}
