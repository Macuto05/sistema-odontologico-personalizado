import { CambioOdontograma as CambioOdontogramaPrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { HallazgoDental, NotaDental } from "@/domain/entities/Odontograma";
import {
  ICambioOdontogramaRepository,
  OpcionesListarCambios,
} from "@/domain/repositories/ICambioOdontogramaRepository";

/** Convierte el modelo de Prisma a la forma del dominio. Principio II. */
export function aDominioCambioOdontograma(c: CambioOdontogramaPrisma): CambioOdontograma {
  return {
    id: c.id,
    odontogramaId: c.odontogramaId,
    pacienteId: c.pacienteId,
    denticion: c.denticion,
    tipoCambio: c.tipoCambio,
    hallazgoId: c.hallazgoId,
    notaId: c.notaId,
    dientes: c.dientes,
    superficie: c.superficie,
    descripcion: c.descripcion,
    snapshot: c.snapshot as unknown as HallazgoDental | NotaDental | null,
    registradoEn: c.registradoEn.toISOString(),
  };
}

/** Implementación servidor de ICambioOdontogramaRepository — `registrar` es siempre
 * `create` (append-only, research.md #4); no existe ningún método de edición/eliminación. */
export class CambioOdontogramaRepositoryPrisma implements ICambioOdontogramaRepository {
  async registrar(cambio: CambioOdontograma): Promise<void> {
    await prisma.cambioOdontograma.create({
      data: {
        id: cambio.id,
        odontogramaId: cambio.odontogramaId,
        pacienteId: cambio.pacienteId,
        denticion: cambio.denticion,
        tipoCambio: cambio.tipoCambio,
        hallazgoId: cambio.hallazgoId,
        notaId: cambio.notaId,
        dientes: cambio.dientes,
        superficie: cambio.superficie,
        descripcion: cambio.descripcion,
        snapshot: (cambio.snapshot ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        registradoEn: new Date(cambio.registradoEn),
      },
    });
  }

  /** `select` explícito (Principio VIII) — no hay campos pesados en este modelo, pero se
   * mantiene el criterio del resto del proyecto. */
  async listarPorOdontograma(
    odontogramaId: string,
    opciones: OpcionesListarCambios = {},
  ): Promise<CambioOdontograma[]> {
    const { pagina = 1, limite = 50, desde } = opciones;
    const resultados = await prisma.cambioOdontograma.findMany({
      where: {
        odontogramaId,
        ...(desde ? { registradoEn: { gt: new Date(desde) } } : {}),
      },
      orderBy: [{ registradoEn: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioCambioOdontograma);
  }

  /** Pull incremental global — usado solo por el motor de sync (research.md #9). */
  async listarTodas(
    opciones: { desde?: string; pagina?: number; limite?: number } = {},
  ): Promise<CambioOdontograma[]> {
    const { desde, pagina = 1, limite = 200 } = opciones;
    const resultados = await prisma.cambioOdontograma.findMany({
      where: desde ? { registradoEn: { gt: new Date(desde) } } : {},
      orderBy: [{ registradoEn: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioCambioOdontograma);
  }
}
