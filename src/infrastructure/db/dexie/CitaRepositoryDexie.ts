import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import {
  Cita,
  DatosEdicionCita,
  DatosNuevaCita,
  ResultadoEdicionCita,
  crearCitaDesdeDatos,
} from "@/domain/entities/Cita";
import { ICitaRepository, OpcionesListarCitas } from "@/domain/repositories/ICitaRepository";
import { CitaFinalizadaError, CitaNoEncontradaError } from "@/domain/errors";

/** Aplica solo los campos presentes en `datos` — un tab (Diagnóstico/Receta/Estudios) no
 * debe pisar lo que otro tab ya guardó (a diferencia de PacienteFormulario, que siempre
 * envía el objeto completo). `"campo" in datos` distingue "no lo tocó este guardado" de
 * "lo vació explícitamente" (que sí llega como `null` tras el schema de texto libre). */
function aplicarParches(actual: Cita, datos: DatosEdicionCita): Cita {
  return {
    ...actual,
    ...("categoria" in datos ? { categoria: datos.categoria ?? null } : {}),
    ...("motivoConsulta" in datos ? { motivoConsulta: datos.motivoConsulta ?? null } : {}),
    ...("diagnostico" in datos ? { diagnostico: datos.diagnostico ?? null } : {}),
    ...("recetaItems" in datos ? { recetaItems: datos.recetaItems ?? [] } : {}),
    ...("estudioItems" in datos ? { estudioItems: datos.estudioItems ?? [] } : {}),
  };
}

/**
 * Implementación cliente (local-first) de ICitaRepository — lee/escribe siempre contra
 * IndexedDB (Dexie), con o sin conexión, igual que PacienteRepositoryDexie. La detección
 * de conflicto real ocurre en el servidor durante la sincronización — acá `editar()`
 * siempre aplica de forma optimista (`conflicto: false`).
 */
export class CitaRepositoryDexie implements ICitaRepository {
  /** research.md #6: busca localmente antes de crear, sin round-trip de red. */
  async crearOAbrir(datos: DatosNuevaCita): Promise<Cita> {
    const enCurso = await db.citas
      .where("[pacienteId+estado]")
      .equals([datos.pacienteId, "EN_CURSO"])
      .first();
    if (enCurso) return enCurso;

    const nueva = crearCitaDesdeDatos(datos);
    await db.citas.add(nueva);
    await encolarOperacion(
      "CITA",
      nueva.id,
      "CREAR",
      { id: nueva.id, pacienteId: nueva.pacienteId },
      nueva.version,
    );
    return nueva;
  }

  async obtenerPorId(id: string): Promise<Cita | null> {
    return (await db.citas.get(id)) ?? null;
  }

  /** Lista corta por paciente — se ordena en memoria, sin índice de orden dedicado. */
  async listarPorPaciente(pacienteId: string, opciones: OpcionesListarCitas = {}): Promise<Cita[]> {
    const todas = await db.citas.where("pacienteId").equals(pacienteId).toArray();
    const filtradas =
      !opciones.estado || opciones.estado === "TODOS"
        ? todas
        : todas.filter((c) => c.estado === opciones.estado);
    return filtradas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async editar(id: string, datos: DatosEdicionCita): Promise<ResultadoEdicionCita> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new CitaNoEncontradaError(id);
    if (actual.estado === "FINALIZADA") throw new CitaFinalizadaError();

    const actualizada: Cita = {
      ...aplicarParches(actual, datos),
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.citas.put(actualizada);
    await encolarOperacion("CITA", id, "EDITAR", actualizada, datos.baseVersion);
    return { cita: actualizada, conflicto: false };
  }

  /** Idempotente: finalizar una cita ya finalizada no encola nada nuevo (research.md #7). */
  async finalizar(id: string, baseVersion: number): Promise<ResultadoEdicionCita> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new CitaNoEncontradaError(id);
    if (actual.estado === "FINALIZADA") return { cita: actual, conflicto: false };

    const actualizada: Cita = {
      ...actual,
      estado: "FINALIZADA",
      finalizadaEn: new Date().toISOString(),
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.citas.put(actualizada);
    await encolarOperacion("CITA", id, "FINALIZAR", {}, baseVersion);
    return { cita: actualizada, conflicto: false };
  }
}
