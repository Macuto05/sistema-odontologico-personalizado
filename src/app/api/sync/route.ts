import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma/client";
import { PacienteRepositoryPrisma } from "@/infrastructure/db/prisma/PacienteRepositoryPrisma";
import { ConsultorioRepositoryPrisma } from "@/infrastructure/db/prisma/ConsultorioRepositoryPrisma";
import { CitaRepositoryPrisma } from "@/infrastructure/db/prisma/CitaRepositoryPrisma";
import { OdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/OdontogramaRepositoryPrisma";
import { CambioOdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/CambioOdontogramaRepositoryPrisma";
import { ItemPlanTratamientoRepositoryPrisma } from "@/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma";
import { InsumoRepositoryPrisma } from "@/infrastructure/db/prisma/InsumoRepositoryPrisma";
import {
  syncRequestSchema,
  OperacionSync,
  OperacionSyncPaciente,
  OperacionSyncConsultorio,
  OperacionSyncCita,
  OperacionSyncOdontograma,
  OperacionSyncCambioOdontograma,
  OperacionSyncItemPlanTratamiento,
  OperacionSyncInsumo,
} from "@/application/dto/syncDto";
import { crearInsumoInputSchema, editarInsumoInputSchema } from "@/application/dto/insumoDto";
import { crearPacienteInputSchema } from "@/application/dto/pacienteDto";
import { crearCitaInputSchema, editarCitaInputSchema } from "@/application/dto/citaDto";
import {
  hallazgoInputSchema,
  notaDentalInputSchema,
  itemPlanTratamientoInputSchema,
  editarItemPlanTratamientoInputSchema,
} from "@/application/dto/odontogramaDto";
import { puedeEditarse } from "@/domain/entities/Paciente";
import { Denticion, HallazgoDental, NotaDental } from "@/domain/entities/Odontograma";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import {
  CitaFinalizadaError,
  CitaNoEncontradaError,
  DocumentoDuplicadoError,
  InsumoArchivadoError,
  InsumoNoEncontradoError,
  InsumoNoEstaArchivadoError,
  ItemPlanTratamientoNoEncontradoError,
  NombreConsultorioDuplicadoError,
  OdontogramaNoEncontradoError,
  PacienteArchivadoError,
  PacienteNoEncontradoError,
  PacienteNoEstaArchivadoError,
} from "@/domain/errors";

const pacienteRepo = new PacienteRepositoryPrisma();
const consultorioRepo = new ConsultorioRepositoryPrisma();
const citaRepo = new CitaRepositoryPrisma();
const odontogramaRepo = new OdontogramaRepositoryPrisma();
const cambioOdontogramaRepo = new CambioOdontogramaRepositoryPrisma();
const itemPlanTratamientoRepo = new ItemPlanTratamientoRepositoryPrisma();
const insumoRepo = new InsumoRepositoryPrisma();

type ResultadoOperacion = {
  id: string;
  estado: "SINCRONIZADO" | "CONFLICTO" | "RECHAZADO";
  paciente?: unknown;
  pacienteExistente?: unknown;
  consultorio?: unknown;
  consultorioExistente?: unknown;
  consultorioEliminadoId?: string;
  cita?: unknown;
  odontograma?: unknown;
  cambioOdontograma?: unknown;
  itemPlanTratamiento?: unknown;
  insumo?: unknown;
  error?: string;
};

/** Aplica una operación de Paciente — contracts/patients-api.md, contracts/sync-api.md. */
async function aplicarOperacionPaciente(op: OperacionSyncPaciente): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const yaExiste = await pacienteRepo.obtenerPorId(op.entidadId);
        if (yaExiste) return { id: op.id, estado: "SINCRONIZADO", paciente: yaExiste };
        const datos = crearPacienteInputSchema.parse(op.payload);
        const creado = await pacienteRepo.crear(datos);
        return { id: op.id, estado: "SINCRONIZADO", paciente: creado };
      }
      case "EDITAR": {
        const { conflicto, paciente } = await pacienteRepo.editar(op.entidadId, {
          ...(op.payload as object),
          baseVersion: op.baseVersion,
        } as Parameters<typeof pacienteRepo.editar>[1]);
        return { id: op.id, estado: conflicto ? "CONFLICTO" : "SINCRONIZADO", paciente };
      }
      case "ARCHIVAR": {
        const { paciente } = await pacienteRepo.archivar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO", paciente };
      }
      case "REACTIVAR": {
        const paciente = await pacienteRepo.reactivar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO", paciente };
      }
    }
  } catch (err) {
    if (err instanceof DocumentoDuplicadoError) {
      return {
        id: op.id,
        estado: "RECHAZADO",
        error: "DOCUMENTO_DUPLICADO",
        pacienteExistente: err.pacienteExistente,
      };
    }
    if (err instanceof PacienteArchivadoError) {
      return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_ARCHIVADO" };
    }
    if (err instanceof PacienteNoEstaArchivadoError) {
      return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ARCHIVADO" };
    }
    if (err instanceof PacienteNoEncontradoError) {
      return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ENCONTRADO" };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/**
 * Aplica una operación de Consultorio — contracts/consultorios-api.md. Sin `EDITAR`: solo
 * `CREAR`/`ELIMINAR`, ambas idempotentes (research.md #2, #3 de 004-consultorios).
 */
async function aplicarOperacionConsultorio(
  op: OperacionSyncConsultorio,
): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const yaExiste = await consultorioRepo.obtenerPorId(op.entidadId);
        if (yaExiste) return { id: op.id, estado: "SINCRONIZADO", consultorio: yaExiste };
        const payload = op.payload as { id: string; nombre: string };
        const creado = await consultorioRepo.crear({ id: op.entidadId, nombre: payload.nombre });
        return { id: op.id, estado: "SINCRONIZADO", consultorio: creado };
      }
      case "ELIMINAR": {
        await consultorioRepo.eliminar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO", consultorioEliminadoId: op.entidadId };
      }
    }
  } catch (err) {
    if (err instanceof NombreConsultorioDuplicadoError) {
      // Principio III: nunca se descarta en silencio — queda marcada CONFLICTO en el
      // outbox local del dispositivo que la generó (research.md #3).
      return {
        id: op.id,
        estado: "RECHAZADO",
        error: "NOMBRE_DUPLICADO",
        consultorioExistente: err.consultorioExistente,
      };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/**
 * Aplica una operación de Cita — contracts/citas-api.md, research.md #6, #7, #8, #10.
 * `baseVersion` es opcional a nivel de schema (research.md #6) pero obligatorio en la
 * práctica para EDITAR/FINALIZAR — se valida acá, no en el schema.
 */
async function aplicarOperacionCita(op: OperacionSyncCita): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const { id, pacienteId } = crearCitaInputSchema.parse(op.payload);
        const paciente = await pacienteRepo.obtenerPorId(pacienteId);
        if (!paciente) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ENCONTRADO" };
        }
        if (!puedeEditarse(paciente)) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_ARCHIVADO" };
        }
        const cita = await citaRepo.crearOAbrir({ id, pacienteId });
        return { id: op.id, estado: "SINCRONIZADO", cita };
      }
      case "EDITAR": {
        if (op.baseVersion === undefined) {
          return { id: op.id, estado: "RECHAZADO", error: "VALIDACION" };
        }
        const datos = editarCitaInputSchema.parse({
          ...(op.payload as object),
          baseVersion: op.baseVersion,
        });
        const { conflicto, cita } = await citaRepo.editar(op.entidadId, datos);
        return { id: op.id, estado: conflicto ? "CONFLICTO" : "SINCRONIZADO", cita };
      }
      case "FINALIZAR": {
        if (op.baseVersion === undefined) {
          return { id: op.id, estado: "RECHAZADO", error: "VALIDACION" };
        }
        const { conflicto, cita } = await citaRepo.finalizar(op.entidadId, op.baseVersion);
        return { id: op.id, estado: conflicto ? "CONFLICTO" : "SINCRONIZADO", cita };
      }
    }
  } catch (err) {
    if (err instanceof CitaFinalizadaError) {
      return { id: op.id, estado: "RECHAZADO", error: "CITA_FINALIZADA" };
    }
    if (err instanceof CitaNoEncontradaError) {
      return { id: op.id, estado: "RECHAZADO", error: "CITA_NO_ENCONTRADA" };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/**
 * Aplica una operación de Odontograma — contracts/odontograma-api.md, research.md #2, #9,
 * #10. Mismo control de acceso a nivel de registro que Cita (Principio VII): valida que el
 * paciente exista y no esté archivado (FR-019) tanto en CREAR como en EDITAR.
 */
async function aplicarOperacionOdontograma(
  op: OperacionSyncOdontograma,
): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const payload = op.payload as { id: string; pacienteId: string; denticion: Denticion };
        const paciente = await pacienteRepo.obtenerPorId(payload.pacienteId);
        if (!paciente) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ENCONTRADO" };
        }
        if (!puedeEditarse(paciente)) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_ARCHIVADO" };
        }
        // Usa siempre el id generado por el cliente (payload.id) — nunca uno propio (ver
        // IOdontogramaRepository), o el próximo pull lo insertaría como un Odontograma
        // duplicado en vez de reconciliarlo con el que el cliente ya tiene localmente.
        const odontograma = await odontogramaRepo.obtenerOCrear({
          id: payload.id,
          pacienteId: payload.pacienteId,
          denticion: payload.denticion,
        });
        return { id: op.id, estado: "SINCRONIZADO", odontograma };
      }
      case "EDITAR": {
        if (op.baseVersion === undefined) {
          return { id: op.id, estado: "RECHAZADO", error: "VALIDACION" };
        }
        const actual = await odontogramaRepo.obtenerPorId(op.entidadId);
        if (!actual) throw new OdontogramaNoEncontradoError(op.entidadId);
        const paciente = await pacienteRepo.obtenerPorId(actual.pacienteId);
        if (!paciente) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ENCONTRADO" };
        }
        if (!puedeEditarse(paciente)) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_ARCHIVADO" };
        }
        const payload = op.payload as { hallazgos?: unknown; notas?: unknown };
        const hallazgos = z.array(hallazgoInputSchema).parse(payload.hallazgos ?? []);
        const notas = z.array(notaDentalInputSchema).parse(payload.notas ?? []);
        const { conflicto, odontograma } = await odontogramaRepo.editar(op.entidadId, {
          hallazgos: hallazgos as HallazgoDental[],
          notas: notas as NotaDental[],
          baseVersion: op.baseVersion,
        });
        return { id: op.id, estado: conflicto ? "CONFLICTO" : "SINCRONIZADO", odontograma };
      }
    }
  } catch (err) {
    if (err instanceof OdontogramaNoEncontradoError) {
      return { id: op.id, estado: "RECHAZADO", error: "ODONTOGRAMA_NO_ENCONTRADO" };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/**
 * Aplica una operación de CambioOdontograma — solo `CREAR` existe en el schema (el propio
 * tipo cierra la puerta a `EDITAR`/`ELIMINAR`, research.md #4) — siempre `create` puro, sin
 * detección de conflicto (append-only).
 */
async function aplicarOperacionCambioOdontograma(
  op: OperacionSyncCambioOdontograma,
): Promise<ResultadoOperacion> {
  try {
    const cambio = op.payload as CambioOdontograma;
    await cambioOdontogramaRepo.registrar(cambio);
    return { id: op.id, estado: "SINCRONIZADO", cambioOdontograma: cambio };
  } catch {
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/** Aplica una operación de ItemPlanTratamiento — mismo mecanismo de conflicto que Paciente. */
async function aplicarOperacionItemPlanTratamiento(
  op: OperacionSyncItemPlanTratamiento,
): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const payload = op.payload as { pacienteId: string };
        const paciente = await pacienteRepo.obtenerPorId(payload.pacienteId);
        if (!paciente) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_NO_ENCONTRADO" };
        }
        if (!puedeEditarse(paciente)) {
          return { id: op.id, estado: "RECHAZADO", error: "PACIENTE_ARCHIVADO" };
        }
        const datos = itemPlanTratamientoInputSchema.parse(op.payload);
        const item = await itemPlanTratamientoRepo.crear({
          id: op.entidadId,
          pacienteId: payload.pacienteId,
          ...datos,
        });
        return { id: op.id, estado: "SINCRONIZADO", itemPlanTratamiento: item };
      }
      case "EDITAR": {
        if (op.baseVersion === undefined) {
          return { id: op.id, estado: "RECHAZADO", error: "VALIDACION" };
        }
        const datos = editarItemPlanTratamientoInputSchema.parse({
          ...(op.payload as object),
          baseVersion: op.baseVersion,
        });
        const { conflicto, item } = await itemPlanTratamientoRepo.editar(
          op.entidadId,
          datos,
        );
        return {
          id: op.id,
          estado: conflicto ? "CONFLICTO" : "SINCRONIZADO",
          itemPlanTratamiento: item,
        };
      }
      case "ELIMINAR": {
        await itemPlanTratamientoRepo.eliminar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO" };
      }
    }
  } catch (err) {
    if (err instanceof ItemPlanTratamientoNoEncontradoError) {
      return { id: op.id, estado: "RECHAZADO", error: "ITEM_PLAN_TRATAMIENTO_NO_ENCONTRADO" };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

/**
 * Aplica una operación de Insumo — contracts/insumos-api.md, contracts/sync-api-delta.md.
 * Mismo mecanismo de conflicto e idempotencia que Paciente. Sin validación de unicidad: dos
 * insumos pueden llamarse igual (spec §Edge Cases).
 */
async function aplicarOperacionInsumo(op: OperacionSyncInsumo): Promise<ResultadoOperacion> {
  try {
    switch (op.tipo) {
      case "CREAR": {
        const yaExiste = await insumoRepo.obtenerPorId(op.entidadId);
        if (yaExiste) return { id: op.id, estado: "SINCRONIZADO", insumo: yaExiste };
        const datos = crearInsumoInputSchema.parse(op.payload);
        const creado = await insumoRepo.crear(datos);
        return { id: op.id, estado: "SINCRONIZADO", insumo: creado };
      }
      case "EDITAR": {
        const datos = editarInsumoInputSchema.parse({
          ...(op.payload as object),
          baseVersion: op.baseVersion,
        });
        const { conflicto, insumo } = await insumoRepo.editar(op.entidadId, datos);
        return { id: op.id, estado: conflicto ? "CONFLICTO" : "SINCRONIZADO", insumo };
      }
      case "ARCHIVAR": {
        const { insumo } = await insumoRepo.archivar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO", insumo };
      }
      case "REACTIVAR": {
        const insumo = await insumoRepo.reactivar(op.entidadId);
        return { id: op.id, estado: "SINCRONIZADO", insumo };
      }
    }
  } catch (err) {
    if (err instanceof InsumoArchivadoError) {
      return { id: op.id, estado: "RECHAZADO", error: "INSUMO_ARCHIVADO" };
    }
    if (err instanceof InsumoNoEstaArchivadoError) {
      return { id: op.id, estado: "RECHAZADO", error: "INSUMO_NO_ARCHIVADO" };
    }
    if (err instanceof InsumoNoEncontradoError) {
      return { id: op.id, estado: "RECHAZADO", error: "INSUMO_NO_ENCONTRADO" };
    }
    return { id: op.id, estado: "RECHAZADO", error: "ERROR_DESCONOCIDO" };
  }
}

function aplicarOperacion(op: OperacionSync): Promise<ResultadoOperacion> {
  if (op.entidad === "PACIENTE") return aplicarOperacionPaciente(op);
  if (op.entidad === "CONSULTORIO") return aplicarOperacionConsultorio(op);
  if (op.entidad === "CITA") return aplicarOperacionCita(op);
  if (op.entidad === "ODONTOGRAMA") return aplicarOperacionOdontograma(op);
  if (op.entidad === "CAMBIO_ODONTOGRAMA") return aplicarOperacionCambioOdontograma(op);
  if (op.entidad === "INSUMO") return aplicarOperacionInsumo(op);
  return aplicarOperacionItemPlanTratamiento(op);
}

/** POST /api/sync — contracts/sync-api.md, contracts/consultorios-api.md. Protegido por middleware. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseo = syncRequestSchema.safeParse(body);
  if (!parseo.success) {
    return NextResponse.json({ error: "VALIDACION", detalles: parseo.error.flatten() }, { status: 422 });
  }

  const resultados: ResultadoOperacion[] = [];

  for (const op of parseo.data.operaciones) {
    // Idempotencia (contracts/sync-api.md): una operación ya procesada no se vuelve a aplicar.
    const yaProcesada = await prisma.operacionSincronizada.findUnique({ where: { id: op.id } });
    if (yaProcesada) {
      resultados.push(yaProcesada.resultado as ResultadoOperacion);
      continue;
    }

    const resultado = await aplicarOperacion(op);
    await prisma.operacionSincronizada.create({
      data: { id: op.id, resultado: resultado as object },
    });
    resultados.push(resultado);
  }

  return NextResponse.json({ resultados });
}
