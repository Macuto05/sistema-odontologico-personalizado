import { Insumo as InsumoPrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { DatosNuevoInsumo, Insumo, crearInsumoDesdeDatos } from "@/domain/entities/Insumo";
import {
  DatosEdicionInsumo,
  IInsumoRepository,
  OpcionesBusquedaInsumos,
  ResultadoArchivadoInsumo,
  ResultadoBusquedaInsumos,
  ResultadoEdicionInsumo,
} from "@/domain/repositories/IInsumoRepository";
import {
  InsumoArchivadoError,
  InsumoNoEncontradoError,
  InsumoNoEstaArchivadoError,
} from "@/domain/errors";

/** Convierte el modelo de Prisma (Date) a la forma del dominio (ISO string). Principio II. */
function aDominio(i: InsumoPrisma): Insumo {
  return {
    id: i.id,
    nombre: i.nombre,
    categoria: i.categoria,
    stockActual: i.stockActual,
    stockMinimo: i.stockMinimo,
    estado: i.estado,
    version: i.version,
    conflictoPendiente: i.conflictoPendiente as Insumo["conflictoPendiente"],
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

/**
 * "A reponer" es `stockActual <= stockMinimo` — una comparación entre dos columnas, que el
 * `where` declarativo de Prisma no expresa. Se resuelve con un filtro SQL crudo pero
 * **parametrizado** vía `Prisma.sql` (Principio VII: nunca concatenación de strings); es
 * la única forma de mantener el filtro en la base en vez de traer toda la tabla y filtrar
 * en memoria (Principio VIII).
 */
const FILTRO_A_REPONER = Prisma.sql`"stockActual" <= "stockMinimo"`;

/** Implementación servidor (fuente de verdad) de IInsumoRepository — Prisma/PostgreSQL. */
export class InsumoRepositoryPrisma implements IInsumoRepository {
  async crear(datos: DatosNuevoInsumo): Promise<Insumo> {
    // Sin unicidad que validar: dos insumos pueden llamarse igual (spec §Edge Cases).
    const nuevo = crearInsumoDesdeDatos(datos);
    const creado = await prisma.insumo.create({
      data: {
        id: nuevo.id,
        nombre: nuevo.nombre,
        categoria: nuevo.categoria,
        stockActual: nuevo.stockActual,
        stockMinimo: nuevo.stockMinimo,
        estado: nuevo.estado,
        version: nuevo.version,
      },
    });
    return aDominio(creado);
  }

  async buscar(opciones: OpcionesBusquedaInsumos): Promise<ResultadoBusquedaInsumos> {
    const estado = opciones.estado ?? "ACTIVO";
    const pagina = opciones.pagina ?? 1;
    const limite = opciones.limite ?? 10;

    const where: Prisma.InsumoWhereInput = {
      ...(estado === "TODOS" ? {} : { estado }),
      ...(opciones.q ? { nombre: { contains: opciones.q, mode: "insensitive" } } : {}),
      ...(opciones.categoria ? { categoria: opciones.categoria } : {}),
      // Pull incremental del motor de sync — no usado por la pantalla.
      ...(opciones.desde ? { updatedAt: { gt: new Date(opciones.desde) } } : {}),
      ...(opciones.aReponer ? { AND: [{ id: { in: await this.idsAReponer() } }] } : {}),
    };

    // Desempate por id para que la paginación sea estable entre páginas.
    const [resultados, total] = await Promise.all([
      prisma.insumo.findMany({
        where,
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.insumo.count({ where }),
    ]);

    return { insumos: resultados.map(aDominio), total };
  }

  /**
   * Ids de los insumos (de cualquier estado) que están a reponer — el `where` de Prisma no
   * compara dos columnas entre sí, así que la comparación va en SQL parametrizado y el
   * resultado se cruza con el resto de los filtros declarativos.
   */
  private async idsAReponer(): Promise<string[]> {
    const filas = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "Insumo" WHERE ${FILTRO_A_REPONER}`,
    );
    return filas.map((f) => f.id);
  }

  async obtenerPorId(id: string): Promise<Insumo | null> {
    const i = await prisma.insumo.findUnique({ where: { id } });
    return i ? aDominio(i) : null;
  }

  async listarCategorias(): Promise<string[]> {
    const filas = await prisma.insumo.findMany({
      where: { estado: "ACTIVO", categoria: { not: null } },
      select: { categoria: true },
      distinct: ["categoria"],
      orderBy: { categoria: "asc" },
    });
    return filas.map((f) => f.categoria).filter((c): c is string => c !== null);
  }

  async contarAReponer(): Promise<number> {
    // FR-010: los archivados nunca cuentan, sin importar su stock (US2-AC4).
    const filas = await prisma.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`SELECT COUNT(*) AS total FROM "Insumo" WHERE "estado" = 'ACTIVO'::"EstadoInsumo" AND ${FILTRO_A_REPONER}`,
    );
    return Number(filas[0]?.total ?? 0);
  }

  async editar(id: string, datos: DatosEdicionInsumo): Promise<ResultadoEdicionInsumo> {
    const actual = await prisma.insumo.findUnique({ where: { id } });
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") throw new InsumoArchivadoError();

    const conflicto = datos.baseVersion !== actual.version;

    const actualizado = await prisma.insumo.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        categoria: datos.categoria ?? null,
        stockActual: datos.stockActual,
        stockMinimo: datos.stockMinimo,
        version: { increment: 1 },
        // Principio III: un conflicto nunca descarta la edición, la aplica y la marca.
        conflictoPendiente: conflicto
          ? ({
              versionServidor: aDominio(actual),
              versionDispositivo: datos,
              detectadoEn: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return { insumo: aDominio(actualizado), conflicto };
  }

  async archivar(id: string): Promise<ResultadoArchivadoInsumo> {
    const actual = await prisma.insumo.findUnique({ where: { id } });
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") {
      return { insumo: aDominio(actual), yaEstabaArchivado: true };
    }
    const actualizado = await prisma.insumo.update({
      where: { id },
      data: { estado: "ARCHIVADO" },
    });
    return { insumo: aDominio(actualizado), yaEstabaArchivado: false };
  }

  async reactivar(id: string): Promise<Insumo> {
    const actual = await prisma.insumo.findUnique({ where: { id } });
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ACTIVO") throw new InsumoNoEstaArchivadoError();
    const actualizado = await prisma.insumo.update({
      where: { id },
      data: { estado: "ACTIVO" },
    });
    return aDominio(actualizado);
  }
}
