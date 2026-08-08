import { ArchivoEstudio as ArchivoEstudioPrisma, Cita as CitaPrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import {
  Cita,
  DatosEdicionCita,
  DatosNuevaCita,
  EstudioItem,
  ItemReceta,
  ResultadoEdicionCita,
  crearCitaDesdeDatos,
} from "@/domain/entities/Cita";
import { ICitaRepository, OpcionesListarCitas } from "@/domain/repositories/ICitaRepository";
import { CitaFinalizadaError, CitaNoEncontradaError } from "@/domain/errors";

/** Nunca incluye `contenido` (Principio VIII, research.md #3, #13) — solo la metadata
 * liviana que se embebe en cada EstudioItem al leer una Cita. */
export const SELECT_METADATA_ARCHIVOS = {
  select: { id: true, estudioItemId: true, nombreArchivo: true, tipo: true, createdAt: true },
} as const;

type ArchivoEstudioMetaPrisma = Pick<
  ArchivoEstudioPrisma,
  "id" | "estudioItemId" | "nombreArchivo" | "tipo" | "createdAt"
>;

type CitaConArchivos = CitaPrisma & { archivos: ArchivoEstudioMetaPrisma[] };

/** Convierte el modelo de Prisma (Date, Json) a la forma del dominio. Principio II. Junta
 * la metadata de `ArchivoEstudio` (tabla propia) dentro de cada `EstudioItem` embebido —
 * research.md #3: son datos separados en PostgreSQL, pero un solo objeto en el dominio. */
export function aDominioCita(c: CitaConArchivos): Cita {
  const estudioItemsBase = (c.estudioItems as unknown as Omit<EstudioItem, "archivos">[]) ?? [];
  const estudioItems: EstudioItem[] = estudioItemsBase.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    motivo: item.motivo ?? null,
    archivos: c.archivos
      .filter((a) => a.estudioItemId === item.id)
      .map((a) => ({
        id: a.id,
        nombreArchivo: a.nombreArchivo,
        tipo: a.tipo,
        createdAt: a.createdAt.toISOString(),
      })),
  }));

  return {
    id: c.id,
    pacienteId: c.pacienteId,
    estado: c.estado,
    categoria: c.categoria,
    motivoConsulta: c.motivoConsulta,
    diagnostico: c.diagnostico,
    recetaItems: (c.recetaItems as unknown as ItemReceta[]) ?? [],
    estudioItems,
    version: c.version,
    conflictoPendiente: c.conflictoPendiente as Cita["conflictoPendiente"],
    finalizadaEn: c.finalizadaEn ? c.finalizadaEn.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Implementación servidor (fuente de verdad) de ICitaRepository — Prisma/PostgreSQL. */
export class CitaRepositoryPrisma implements ICitaRepository {
  /** Idempotente por `id` + reconciliación por `pacienteId` (research.md #6). */
  async crearOAbrir(datos: DatosNuevaCita): Promise<Cita> {
    const porId = await prisma.cita.findUnique({
      where: { id: datos.id },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    if (porId) return aDominioCita(porId);

    const enCursoDelPaciente = await prisma.cita.findFirst({
      where: { pacienteId: datos.pacienteId, estado: "EN_CURSO" },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    if (enCursoDelPaciente) return aDominioCita(enCursoDelPaciente);

    const nueva = crearCitaDesdeDatos(datos);
    const creada = await prisma.cita.create({
      data: {
        id: nueva.id,
        pacienteId: nueva.pacienteId,
        estado: nueva.estado,
        version: nueva.version,
        recetaItems: nueva.recetaItems as unknown as Prisma.InputJsonValue,
        estudioItems: nueva.estudioItems as unknown as Prisma.InputJsonValue,
      },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    return aDominioCita(creada);
  }

  async obtenerPorId(id: string): Promise<Cita | null> {
    const c = await prisma.cita.findUnique({
      where: { id },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    return c ? aDominioCita(c) : null;
  }

  async listarPorPaciente(pacienteId: string, opciones: OpcionesListarCitas = {}): Promise<Cita[]> {
    const { estado, desde, pagina = 1, limite = 50 } = opciones;
    const where: Prisma.CitaWhereInput = {
      pacienteId,
      ...(estado && estado !== "TODOS" ? { estado } : {}),
      // Pull incremental del motor de sync (research.md #13, igual criterio que Paciente).
      ...(desde ? { updatedAt: { gt: new Date(desde) } } : {}),
    };

    const resultados = await prisma.cita.findMany({
      where,
      include: { archivos: SELECT_METADATA_ARCHIVOS },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioCita);
  }

  /** Pull incremental *global* (todos los pacientes) usado por el motor de sync —
   * `GET /api/citas`, no por ninguna pantalla directamente (research.md #13). No forma
   * parte de ICitaRepository porque CitaRepositoryDexie nunca necesita "todas las citas
   * de todos los pacientes" para su propia UI — es exclusivo de esta implementación. */
  async listarTodas(
    opciones: { desde?: string; pagina?: number; limite?: number } = {},
  ): Promise<Cita[]> {
    const { desde, pagina = 1, limite = 200 } = opciones;
    const where: Prisma.CitaWhereInput = {
      ...(desde ? { updatedAt: { gt: new Date(desde) } } : {}),
    };
    const resultados = await prisma.cita.findMany({
      where,
      include: { archivos: SELECT_METADATA_ARCHIVOS },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    });
    return resultados.map(aDominioCita);
  }

  /** Rechaza con CitaFinalizadaError si la cita ya está finalizada (research.md #10). Solo
   * aplica los campos presentes en `datos` — mismo criterio de parche que CitaRepositoryDexie. */
  async editar(id: string, datos: DatosEdicionCita): Promise<ResultadoEdicionCita> {
    const actual = await prisma.cita.findUnique({
      where: { id },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    if (!actual) throw new CitaNoEncontradaError(id);
    if (actual.estado === "FINALIZADA") throw new CitaFinalizadaError();

    const conflicto = datos.baseVersion !== actual.version;

    const actualizada = await prisma.cita.update({
      where: { id },
      data: {
        ...("categoria" in datos ? { categoria: datos.categoria ?? null } : {}),
        ...("motivoConsulta" in datos ? { motivoConsulta: datos.motivoConsulta ?? null } : {}),
        ...("diagnostico" in datos ? { diagnostico: datos.diagnostico ?? null } : {}),
        ...("recetaItems" in datos
          ? { recetaItems: (datos.recetaItems ?? []) as unknown as Prisma.InputJsonValue }
          : {}),
        // `archivos` es metadata derivada de la tabla ArchivoEstudio — nunca se persiste
        // dentro del Json de estudioItems (research.md #3).
        ...("estudioItems" in datos
          ? {
              estudioItems: (datos.estudioItems ?? []).map(({ id: itemId, nombre }) => ({
                id: itemId,
                nombre,
              })) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        version: { increment: 1 },
        // Principio III: un conflicto nunca descarta la edición, la aplica y la marca.
        conflictoPendiente: conflicto
          ? ({
              versionServidor: aDominioCita(actual),
              versionDispositivo: datos,
              detectadoEn: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });

    return { cita: aDominioCita(actualizada), conflicto };
  }

  /** Idempotente si ya está FINALIZADA — no incrementa version ni reevalúa conflicto. */
  async finalizar(id: string, baseVersion: number): Promise<ResultadoEdicionCita> {
    const actual = await prisma.cita.findUnique({
      where: { id },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });
    if (!actual) throw new CitaNoEncontradaError(id);
    if (actual.estado === "FINALIZADA") {
      return { cita: aDominioCita(actual), conflicto: false };
    }

    const conflicto = baseVersion !== actual.version;

    const actualizada = await prisma.cita.update({
      where: { id },
      data: {
        estado: "FINALIZADA",
        finalizadaEn: new Date(),
        version: { increment: 1 },
        conflictoPendiente: conflicto
          ? ({
              versionServidor: aDominioCita(actual),
              versionDispositivo: { baseVersion },
              detectadoEn: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: { archivos: SELECT_METADATA_ARCHIVOS },
    });

    return { cita: aDominioCita(actualizada), conflicto };
  }
}
