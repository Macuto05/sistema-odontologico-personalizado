import { Odontograma as OdontogramaPrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import {
  DatosEdicionOdontograma,
  DatosNuevoOdontograma,
  HallazgoDental,
  NotaDental,
  Odontograma,
  ResultadoEdicionOdontograma,
  crearOdontogramaVacio,
} from "@/domain/entities/Odontograma";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { OdontogramaNoEncontradoError } from "@/domain/errors";

/** Convierte el modelo de Prisma (Date, Json) a la forma del dominio. Principio II. */
export function aDominioOdontograma(o: OdontogramaPrisma): Odontograma {
  return {
    id: o.id,
    pacienteId: o.pacienteId,
    denticion: o.denticion,
    hallazgos: (o.hallazgos as unknown as HallazgoDental[]) ?? [],
    notas: (o.notas as unknown as NotaDental[]) ?? [],
    version: o.version,
    conflictoPendiente: o.conflictoPendiente as Odontograma["conflictoPendiente"],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

/** Implementación servidor (fuente de verdad) de IOdontogramaRepository — Prisma/PostgreSQL. */
export class OdontogramaRepositoryPrisma implements IOdontogramaRepository {
  /**
   * Idempotente por `(pacienteId, denticion)` — research.md #10. Usa siempre `datos.id`
   * (generado por el cliente) al crear — nunca genera un id propio (ver
   * IOdontogramaRepository): si el servidor asignara otro id distinto al que el cliente ya
   * tiene guardado localmente, el próximo pull insertaría esa fila como un Odontograma
   * duplicado en vez de reconciliarla con la existente.
   */
  async obtenerOCrear(datos: DatosNuevoOdontograma): Promise<Odontograma> {
    const existente = await prisma.odontograma.findUnique({
      where: { pacienteId_denticion: { pacienteId: datos.pacienteId, denticion: datos.denticion } },
    });
    if (existente) return aDominioOdontograma(existente);

    const nuevo = crearOdontogramaVacio(datos);
    const creado = await prisma.odontograma.upsert({
      where: {
        pacienteId_denticion: { pacienteId: datos.pacienteId, denticion: datos.denticion },
      },
      create: {
        id: nuevo.id,
        pacienteId: nuevo.pacienteId,
        denticion: nuevo.denticion,
        version: nuevo.version,
        hallazgos: nuevo.hallazgos as unknown as Prisma.InputJsonValue,
        notas: nuevo.notas as unknown as Prisma.InputJsonValue,
      },
      update: {},
    });
    return aDominioOdontograma(creado);
  }

  async obtenerPorId(id: string): Promise<Odontograma | null> {
    const o = await prisma.odontograma.findUnique({ where: { id } });
    return o ? aDominioOdontograma(o) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Odontograma[]> {
    const resultados = await prisma.odontograma.findMany({ where: { pacienteId } });
    return resultados.map(aDominioOdontograma);
  }

  /** Pull incremental global — usado solo por el motor de sync (research.md #9), no forma
   * parte de IOdontogramaRepository (mismo criterio que `CitaRepositoryPrisma.listarTodas`). */
  async listarTodas(
    opciones: { desde?: string; pagina?: number; limite?: number } = {},
  ): Promise<Odontograma[]> {
    const { desde, pagina = 1, limite = 200 } = opciones;
    const resultados = await prisma.odontograma.findMany({
      where: desde ? { updatedAt: { gt: new Date(desde) } } : {},
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioOdontograma);
  }

  async editar(
    id: string,
    datos: DatosEdicionOdontograma,
  ): Promise<ResultadoEdicionOdontograma> {
    const actual = await prisma.odontograma.findUnique({ where: { id } });
    if (!actual) throw new OdontogramaNoEncontradoError(id);

    const conflicto = datos.baseVersion !== actual.version;

    const actualizado = await prisma.odontograma.update({
      where: { id },
      data: {
        hallazgos: datos.hallazgos as unknown as Prisma.InputJsonValue,
        notas: datos.notas as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        // Principio III: un conflicto nunca descarta la edición, la aplica y la marca.
        conflictoPendiente: conflicto
          ? ({
              versionServidor: aDominioOdontograma(actual),
              versionDispositivo: datos,
              detectadoEn: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return { odontograma: aDominioOdontograma(actualizado), conflicto };
  }
}
