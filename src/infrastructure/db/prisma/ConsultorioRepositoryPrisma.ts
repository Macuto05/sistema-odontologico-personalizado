import { Consultorio as ConsultorioPrisma } from "@prisma/client";
import { prisma } from "./client";
import { Consultorio, DatosNuevoConsultorio } from "@/domain/entities/Consultorio";
import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";
import { NombreConsultorioDuplicadoError } from "@/domain/errors";

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase();
}

/** Convierte el modelo de Prisma al dominio — nunca expone `nombreNormalizado` (data-model.md). */
function aDominio(c: ConsultorioPrisma): Consultorio {
  return { id: c.id, nombre: c.nombre, createdAt: c.createdAt.toISOString() };
}

/**
 * Única implementación servidor de IConsultorioRepository (Prisma/PostgreSQL). Sin
 * `version`/`conflictoPendiente`: solo `crear`/`eliminar`, sin edición (research.md #2).
 */
export class ConsultorioRepositoryPrisma implements IConsultorioRepository {
  async crear(datos: DatosNuevoConsultorio): Promise<Consultorio> {
    const nombreNormalizado = normalizar(datos.nombre);
    const existente = await prisma.consultorio.findUnique({ where: { nombreNormalizado } });
    if (existente) throw new NombreConsultorioDuplicadoError(aDominio(existente));

    const creado = await prisma.consultorio.create({
      data: { id: datos.id, nombre: datos.nombre, nombreNormalizado },
    });
    return aDominio(creado);
  }

  async listar(): Promise<Consultorio[]> {
    const resultados = await prisma.consultorio.findMany({ orderBy: { nombre: "asc" } });
    return resultados.map(aDominio);
  }

  async obtenerPorId(id: string): Promise<Consultorio | null> {
    const c = await prisma.consultorio.findUnique({ where: { id } });
    return c ? aDominio(c) : null;
  }

  /** Idempotente (FR-004) — `onDelete: SetNull` de Postgres anula `Paciente.consultorioId`. */
  async eliminar(id: string): Promise<void> {
    const existente = await prisma.consultorio.findUnique({ where: { id } });
    if (!existente) return;
    await prisma.consultorio.delete({ where: { id } });
  }
}
