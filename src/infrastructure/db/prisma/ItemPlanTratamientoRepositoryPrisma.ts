import { ItemPlanTratamiento as ItemPlanTratamientoPrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import {
  DatosEdicionItemPlanTratamiento,
  DatosNuevoItemPlanTratamiento,
  ItemPlanTratamiento,
  crearItemPlanTratamientoDesdeDatos,
} from "@/domain/entities/ItemPlanTratamiento";
import {
  IItemPlanTratamientoRepository,
  ResultadoEdicionItemPlanTratamiento,
} from "@/domain/repositories/IItemPlanTratamientoRepository";
import { ItemPlanTratamientoNoEncontradoError } from "@/domain/errors";

/** Convierte el modelo de Prisma (Date) a la forma del dominio. Principio II. */
export function aDominioItemPlanTratamiento(i: ItemPlanTratamientoPrisma): ItemPlanTratamiento {
  return {
    id: i.id,
    pacienteId: i.pacienteId,
    fecha: i.fecha.toISOString().slice(0, 10),
    diente: i.diente,
    tratamiento: i.tratamiento,
    fechaRealizado: i.fechaRealizado ? i.fechaRealizado.toISOString().slice(0, 10) : null,
    nota: i.nota,
    version: i.version,
    conflictoPendiente: i.conflictoPendiente as ItemPlanTratamiento["conflictoPendiente"],
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

/** Implementación servidor (fuente de verdad) de IItemPlanTratamientoRepository. */
export class ItemPlanTratamientoRepositoryPrisma implements IItemPlanTratamientoRepository {
  /** Idempotente por `id` — mismo criterio que `PacienteRepositoryPrisma.crear`. */
  async crear(datos: DatosNuevoItemPlanTratamiento): Promise<ItemPlanTratamiento> {
    const existente = await prisma.itemPlanTratamiento.findUnique({ where: { id: datos.id } });
    if (existente) return aDominioItemPlanTratamiento(existente);

    const nuevo = crearItemPlanTratamientoDesdeDatos(datos);
    const creado = await prisma.itemPlanTratamiento.create({
      data: {
        id: nuevo.id,
        pacienteId: nuevo.pacienteId,
        fecha: new Date(nuevo.fecha),
        diente: nuevo.diente,
        tratamiento: nuevo.tratamiento,
        version: nuevo.version,
      },
    });
    return aDominioItemPlanTratamiento(creado);
  }

  async editar(
    id: string,
    datos: DatosEdicionItemPlanTratamiento,
  ): Promise<ResultadoEdicionItemPlanTratamiento> {
    const actual = await prisma.itemPlanTratamiento.findUnique({ where: { id } });
    if (!actual) throw new ItemPlanTratamientoNoEncontradoError(id);

    const conflicto = datos.baseVersion !== actual.version;

    const actualizado = await prisma.itemPlanTratamiento.update({
      where: { id },
      data: {
        ...("fecha" in datos && datos.fecha ? { fecha: new Date(datos.fecha) } : {}),
        ...("diente" in datos ? { diente: datos.diente ?? null } : {}),
        ...("tratamiento" in datos && datos.tratamiento
          ? { tratamiento: datos.tratamiento }
          : {}),
        ...("fechaRealizado" in datos
          ? { fechaRealizado: datos.fechaRealizado ? new Date(datos.fechaRealizado) : null }
          : {}),
        ...("nota" in datos ? { nota: datos.nota ?? null } : {}),
        version: { increment: 1 },
        conflictoPendiente: conflicto
          ? ({
              versionServidor: aDominioItemPlanTratamiento(actual),
              versionDispositivo: datos,
              detectadoEn: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return { item: aDominioItemPlanTratamiento(actualizado), conflicto };
  }

  async eliminar(id: string): Promise<void> {
    const actual = await prisma.itemPlanTratamiento.findUnique({ where: { id } });
    if (!actual) throw new ItemPlanTratamientoNoEncontradoError(id);
    await prisma.itemPlanTratamiento.delete({ where: { id } });
  }

  async listarPorPaciente(pacienteId: string): Promise<ItemPlanTratamiento[]> {
    const resultados = await prisma.itemPlanTratamiento.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "desc" }, { id: "asc" }],
    });
    return resultados.map(aDominioItemPlanTratamiento);
  }

  /** Pull incremental global — usado solo por el motor de sync. */
  async listarTodas(
    opciones: { desde?: string; pagina?: number; limite?: number } = {},
  ): Promise<ItemPlanTratamiento[]> {
    const { desde, pagina = 1, limite = 200 } = opciones;
    const resultados = await prisma.itemPlanTratamiento.findMany({
      where: desde ? { updatedAt: { gt: new Date(desde) } } : {},
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioItemPlanTratamiento);
  }
}
