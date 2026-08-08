import { randomUUID } from "crypto";
import { ArchivoPaciente as ArchivoPacientePrisma } from "@prisma/client";
import { prisma } from "./client";
import {
  ArchivoPaciente,
  ArchivoPacienteMeta,
  DatosNuevoArchivoPaciente,
} from "@/domain/entities/ArchivoPaciente";
import { IArchivoPacienteRepository } from "@/domain/repositories/IArchivoPacienteRepository";
import { ArchivoPacienteNoEncontradoError, PacienteNoEncontradoError } from "@/domain/errors";
import {
  borrarArchivo,
  claveArchivoPaciente,
  leerArchivo,
  subirArchivo,
} from "@/infrastructure/storage/supabase/archivosStorage";

function aDominio(a: ArchivoPacientePrisma, contenido: Uint8Array): ArchivoPaciente {
  return {
    id: a.id,
    pacienteId: a.pacienteId,
    nombreArchivo: a.nombreArchivo,
    tipo: a.tipo,
    tamanoBytes: a.tamanoBytes,
    contenido,
    createdAt: a.createdAt.toISOString(),
  };
}

const SELECT_METADATA = {
  id: true,
  pacienteId: true,
  nombreArchivo: true,
  tipo: true,
  tamanoBytes: true,
  createdAt: true,
} as const;

/**
 * Única implementación de IArchivoPacienteRepository — online-only, sin contraparte Dexie.
 * Desde 012-archivos-supabase-storage la metadata vive en Postgres (vía Prisma) y el
 * contenido binario en Supabase Storage; esta clase es la costura entre ambos y la única
 * que conoce esa división.
 */
export class ArchivoPacienteRepositoryPrisma implements IArchivoPacienteRepository {
  /**
   * Orden deliberado (research.md #3): se sube a Storage ANTES de insertar la fila, para
   * que un fallo nunca deje metadata apuntando a un objeto inexistente (el caso que
   * rompería la lectura). Si el insert falla después de un upload exitoso, se borra el
   * objeto recién subido como compensación (FR-009).
   */
  async agregar(datos: DatosNuevoArchivoPaciente): Promise<ArchivoPaciente> {
    const paciente = await prisma.paciente.findUnique({ where: { id: datos.pacienteId } });
    if (!paciente) throw new PacienteNoEncontradoError(datos.pacienteId);

    // El id se genera acá (en vez de dejarlo a @default(uuid())) porque la clave del
    // objeto en Storage se deriva de él y hay que conocerla antes de subir (research.md #2).
    const id = randomUUID();
    const clave = claveArchivoPaciente(datos.pacienteId, id);

    await subirArchivo(clave, datos.contenido, datos.tipoMime);

    try {
      const creado = await prisma.archivoPaciente.create({
        data: {
          id,
          pacienteId: datos.pacienteId,
          nombreArchivo: datos.nombreArchivo,
          tipo: datos.tipo,
          tamanoBytes: datos.contenido.length,
        },
      });
      return aDominio(creado, datos.contenido);
    } catch (err) {
      // Compensación: el objeto ya subido quedaría huérfano si no se limpia. Un fallo al
      // limpiar no debe tapar el error original, que es el que explica qué salió mal.
      await borrarArchivo(clave).catch(() => {});
      throw err;
    }
  }

  async listar(pacienteId: string): Promise<ArchivoPacienteMeta[]> {
    const archivos = await prisma.archivoPaciente.findMany({
      where: { pacienteId },
      select: SELECT_METADATA,
      orderBy: { createdAt: "desc" },
    });
    return archivos.map((a) => ({
      id: a.id,
      pacienteId: a.pacienteId,
      nombreArchivo: a.nombreArchivo,
      tipo: a.tipo,
      tamanoBytes: a.tamanoBytes,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Control de acceso a nivel de registro (Principio VII): la pertenencia se valida contra
   * Postgres ANTES de tocar Storage — así un id ajeno nunca llega siquiera a producir una
   * lectura del objeto.
   */
  async obtenerContenido(pacienteId: string, archivoId: string): Promise<ArchivoPaciente | null> {
    const archivo = await prisma.archivoPaciente.findUnique({ where: { id: archivoId } });
    if (!archivo || archivo.pacienteId !== pacienteId) return null;

    const contenido = await leerArchivo(claveArchivoPaciente(pacienteId, archivoId));
    return aDominio(archivo, contenido);
  }

  /**
   * Orden inverso al de `agregar` y también deliberado (research.md #3): se borra el objeto
   * primero, porque un objeto sin fila que lo referencie sería invisible para siempre,
   * mientras que una fila cuyo borrado de Storage falló sigue visible y se puede reintentar.
   */
  async eliminar(pacienteId: string, archivoId: string): Promise<void> {
    const archivo = await prisma.archivoPaciente.findUnique({ where: { id: archivoId } });
    if (!archivo || archivo.pacienteId !== pacienteId) {
      throw new ArchivoPacienteNoEncontradoError();
    }

    await borrarArchivo(claveArchivoPaciente(pacienteId, archivoId));
    await prisma.archivoPaciente.delete({ where: { id: archivoId } });
  }
}
