import { Paciente as PacientePrisma, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { DatosNuevoPaciente, Paciente, crearPacienteDesdeDatos } from "@/domain/entities/Paciente";
import {
  DatosEdicionPaciente,
  IPacienteRepository,
  OpcionesBusquedaPacientes,
  ResultadoArchivado,
  ResultadoBusquedaPacientes,
  ResultadoEdicion,
} from "@/domain/repositories/IPacienteRepository";
import {
  DocumentoDuplicadoError,
  PacienteArchivadoError,
  PacienteNoEncontradoError,
  PacienteNoEstaArchivadoError,
} from "@/domain/errors";

/** Convierte el modelo de Prisma (Date) a la forma del dominio (ISO string). Principio II. */
function aDominio(p: PacientePrisma): Paciente {
  return {
    id: p.id,
    nombreCompleto: p.nombreCompleto,
    documentoIdentidad: p.documentoIdentidad,
    fechaNacimiento: p.fechaNacimiento.toISOString().slice(0, 10),
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    genero: p.genero,
    estadoCivil: p.estadoCivil,
    ocupacion: p.ocupacion,
    antecedentesPatologicos: p.antecedentesPatologicos,
    antecedentesPatologicosOtros: p.antecedentesPatologicosOtros,
    antecedentesHeredofamiliares: p.antecedentesHeredofamiliares,
    medicamentosActuales: p.medicamentosActuales,
    alergias: p.alergias,
    estado: p.estado,
    version: p.version,
    conflictoPendiente: p.conflictoPendiente as Paciente["conflictoPendiente"],
    consultorioId: p.consultorioId,
    representanteNombre: p.representanteNombre,
    representanteCedula: p.representanteCedula,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * Traduce edadMin/edadMax (años) a un rango de `fechaNacimiento` — Postgres no guarda la
 * edad, se deriva de la fecha de nacimiento (007-representante-menor, filtro "Filtros").
 */
function rangoFechaNacimientoPorEdad(edadMin?: number, edadMax?: number): Prisma.DateTimeFilter | undefined {
  if (edadMin === undefined && edadMax === undefined) return undefined;
  const rango: Prisma.DateTimeFilter = {};
  const hoy = new Date();
  if (edadMin !== undefined) {
    // Para tener AL MENOS edadMin años, nació el día de hoy-edadMin años o antes.
    const limite = new Date(Date.UTC(hoy.getUTCFullYear() - edadMin, hoy.getUTCMonth(), hoy.getUTCDate()));
    rango.lte = limite;
  }
  if (edadMax !== undefined) {
    // Para tener A LO SUMO edadMax años, no nació antes de hoy-(edadMax+1) años + 1 día.
    const limite = new Date(
      Date.UTC(hoy.getUTCFullYear() - (edadMax + 1), hoy.getUTCMonth(), hoy.getUTCDate() + 1),
    );
    rango.gte = limite;
  }
  return rango;
}

/** Implementación servidor (fuente de verdad) de IPacienteRepository — Prisma/PostgreSQL. */
export class PacienteRepositoryPrisma implements IPacienteRepository {
  async crear(datos: DatosNuevoPaciente): Promise<Paciente> {
    // Sin documento (paciente con representante, FR-001) no hay nada que comparar — la
    // unicidad de `documentoIdentidad` solo aplica cuando el paciente tiene uno propio.
    if (datos.documentoIdentidad) {
      const existente = await prisma.paciente.findUnique({
        where: { documentoIdentidad: datos.documentoIdentidad },
      });
      if (existente) {
        throw new DocumentoDuplicadoError(aDominio(existente));
      }
    }

    const nuevo = crearPacienteDesdeDatos(datos);
    const creado = await prisma.paciente.create({
      data: {
        id: nuevo.id,
        nombreCompleto: nuevo.nombreCompleto,
        documentoIdentidad: nuevo.documentoIdentidad,
        fechaNacimiento: new Date(nuevo.fechaNacimiento),
        telefono: nuevo.telefono,
        email: nuevo.email,
        direccion: nuevo.direccion,
        genero: nuevo.genero,
        estadoCivil: nuevo.estadoCivil,
        ocupacion: nuevo.ocupacion,
        antecedentesPatologicos: nuevo.antecedentesPatologicos,
        antecedentesPatologicosOtros: nuevo.antecedentesPatologicosOtros,
        antecedentesHeredofamiliares: nuevo.antecedentesHeredofamiliares,
        medicamentosActuales: nuevo.medicamentosActuales,
        alergias: nuevo.alergias,
        estado: nuevo.estado,
        version: nuevo.version,
        consultorioId: nuevo.consultorioId,
        representanteNombre: nuevo.representanteNombre,
        representanteCedula: nuevo.representanteCedula,
      },
    });
    return aDominio(creado);
  }

  async buscar(opciones: OpcionesBusquedaPacientes): Promise<ResultadoBusquedaPacientes> {
    const estado = opciones.estado ?? "ACTIVO";
    const pagina = opciones.pagina ?? 1;
    const limite = opciones.limite ?? 10;

    // El documento se guarda como prefijo+dígitos sin separadores (ej. "V29838893"), pero
    // el odontólogo busca solo por los dígitos de la cédula, sin el prefijo — se compara
    // contra cualquier parte del valor guardado (no una igualdad exacta), y con `contains`
    // en vez de `endsWith` para que filtre en tiempo real a medida que se escribe cada
    // número, igual que ya hace la búsqueda por nombre (research.md #15).
    const digitosDocumento = opciones.q?.replace(/\D/g, "") ?? "";

    const where: Prisma.PacienteWhereInput = {
      ...(estado === "TODOS" ? {} : { estado }),
      ...(opciones.q
        ? {
            OR: [
              { nombreCompleto: { contains: opciones.q, mode: "insensitive" } },
              ...(digitosDocumento
                ? [{ documentoIdentidad: { contains: digitosDocumento } }]
                : [{ documentoIdentidad: opciones.q }]),
            ],
          }
        : {}),
      // Pull incremental del motor de sync (research.md #12) — no usado por la pantalla.
      ...(opciones.desde ? { updatedAt: { gt: new Date(opciones.desde) } } : {}),
      // Filtro "Filtros" del listado (007-representante-menor).
      ...(() => {
        const rango = rangoFechaNacimientoPorEdad(opciones.edadMin, opciones.edadMax);
        return rango ? { fechaNacimiento: rango } : {};
      })(),
      ...(opciones.consultorioId !== undefined ? { consultorioId: opciones.consultorioId } : {}),
    };

    // Desempate por id para que la paginación sea estable entre páginas (research.md #11).
    const [resultados, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        orderBy: [{ nombreCompleto: "asc" }, { id: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.paciente.count({ where }),
    ]);

    return { pacientes: resultados.map(aDominio), total };
  }

  async obtenerPorId(id: string): Promise<Paciente | null> {
    const p = await prisma.paciente.findUnique({ where: { id } });
    return p ? aDominio(p) : null;
  }

  async obtenerPorDocumento(documentoIdentidad: string): Promise<Paciente | null> {
    const p = await prisma.paciente.findUnique({ where: { documentoIdentidad } });
    return p ? aDominio(p) : null;
  }

  async editar(id: string, datos: DatosEdicionPaciente): Promise<ResultadoEdicion> {
    const actual = await prisma.paciente.findUnique({ where: { id } });
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") throw new PacienteArchivadoError();

    // Igual que en crear(): sin documento nuevo no hay nada que comparar por unicidad.
    if (datos.documentoIdentidad && datos.documentoIdentidad !== actual.documentoIdentidad) {
      const conDocumento = await prisma.paciente.findUnique({
        where: { documentoIdentidad: datos.documentoIdentidad },
      });
      if (conDocumento && conDocumento.id !== id) {
        throw new DocumentoDuplicadoError(aDominio(conDocumento));
      }
    }

    const conflicto = datos.baseVersion !== actual.version;

    const actualizado = await prisma.paciente.update({
      where: { id },
      data: {
        nombreCompleto: datos.nombreCompleto,
        documentoIdentidad: datos.documentoIdentidad,
        fechaNacimiento: new Date(datos.fechaNacimiento),
        telefono: datos.telefono ?? null,
        email: datos.email ?? null,
        direccion: datos.direccion ?? null,
        genero: datos.genero ?? null,
        estadoCivil: datos.estadoCivil ?? null,
        ocupacion: datos.ocupacion ?? null,
        antecedentesPatologicos: datos.antecedentesPatologicos ?? [],
        antecedentesPatologicosOtros: datos.antecedentesPatologicosOtros ?? [],
        antecedentesHeredofamiliares: datos.antecedentesHeredofamiliares ?? [],
        medicamentosActuales: datos.medicamentosActuales ?? [],
        alergias: datos.alergias ?? [],
        consultorioId: datos.consultorioId ?? null,
        representanteNombre: datos.representanteNombre ?? null,
        representanteCedula: datos.representanteCedula ?? null,
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

    return { paciente: aDominio(actualizado), conflicto };
  }

  async archivar(id: string): Promise<ResultadoArchivado> {
    const actual = await prisma.paciente.findUnique({ where: { id } });
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") {
      return { paciente: aDominio(actual), yaEstabaArchivado: true };
    }
    const actualizado = await prisma.paciente.update({
      where: { id },
      data: { estado: "ARCHIVADO" },
    });
    return { paciente: aDominio(actualizado), yaEstabaArchivado: false };
  }

  async reactivar(id: string): Promise<Paciente> {
    const actual = await prisma.paciente.findUnique({ where: { id } });
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ACTIVO") throw new PacienteNoEstaArchivadoError();
    const actualizado = await prisma.paciente.update({
      where: { id },
      data: { estado: "ACTIVO" },
    });
    return aDominio(actualizado);
  }
}
