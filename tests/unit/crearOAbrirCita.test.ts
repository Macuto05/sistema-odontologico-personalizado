import { describe, expect, it, vi } from "vitest";
import { crearOAbrirCita } from "@/application/use-cases/crearOAbrirCita";
import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { Cita } from "@/domain/entities/Cita";

function citaFalsa(overrides: Partial<Cita> = {}): Cita {
  return {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    estado: "EN_CURSO",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(overrides: Partial<ICitaRepository> = {}): ICitaRepository {
  return {
    crearOAbrir: vi.fn(async (datos) => citaFalsa({ id: datos.id, pacienteId: datos.pacienteId })),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    editar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    finalizar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    ...overrides,
  };
}

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  pacienteId: "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c",
};

describe("crearOAbrirCita", () => {
  it("crea una cita nueva en curso cuando el paciente no tiene ninguna (FR-002)", async () => {
    const repo = repoFalso();
    const cita = await crearOAbrirCita(repo, datosValidos);
    expect(cita.estado).toBe("EN_CURSO");
    expect(repo.crearOAbrir).toHaveBeenCalledWith(datosValidos);
  });

  it("devuelve lo que el repositorio decida (reabrir una cita en curso existente en vez de crear otra, FR-003, research.md #6)", async () => {
    const existente = citaFalsa({ id: "otra-cita-ya-en-curso", pacienteId: datosValidos.pacienteId });
    const repo = repoFalso({ crearOAbrir: vi.fn(async () => existente) });
    const cita = await crearOAbrirCita(repo, datosValidos);
    expect(cita.id).toBe("otra-cita-ya-en-curso");
  });

  it("rechaza datos con id o pacienteId inválidos antes de tocar el repositorio (FR-002)", async () => {
    const repo = repoFalso();
    await expect(
      crearOAbrirCita(repo, { id: "no-es-un-uuid", pacienteId: datosValidos.pacienteId }),
    ).rejects.toThrow();
    expect(repo.crearOAbrir).not.toHaveBeenCalled();
  });
});
