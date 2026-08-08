import { describe, expect, it, vi } from "vitest";
import { listarCitasPaciente } from "@/application/use-cases/listarCitasPaciente";
import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { Cita } from "@/domain/entities/Cita";

function citaFalsa(overrides: Partial<Cita> = {}): Cita {
  return {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    estado: "FINALIZADA",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(overrides: Partial<ICitaRepository> = {}): ICitaRepository {
  return {
    crearOAbrir: vi.fn(async () => citaFalsa()),
    obtenerPorId: vi.fn(async () => citaFalsa()),
    listarPorPaciente: vi.fn(async () => [citaFalsa()]),
    editar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    finalizar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    ...overrides,
  };
}

describe("listarCitasPaciente (US7, FR-021, FR-022)", () => {
  it("pide por defecto solo citas FINALIZADA — la cita en curso nunca aparece (FR-022)", async () => {
    const repo = repoFalso();
    await listarCitasPaciente(repo, "paciente-1");
    expect(repo.listarPorPaciente).toHaveBeenCalledWith(
      "paciente-1",
      expect.objectContaining({ estado: "FINALIZADA" }),
    );
  });

  it("devuelve la lista que trae el repositorio", async () => {
    const finalizadas = [citaFalsa({ id: "a" }), citaFalsa({ id: "b" })];
    const repo = repoFalso({ listarPorPaciente: vi.fn(async () => finalizadas) });
    const citas = await listarCitasPaciente(repo, "paciente-1");
    expect(citas).toEqual(finalizadas);
  });

  it("devuelve una lista vacía si el paciente no tiene citas finalizadas (FR-024)", async () => {
    const repo = repoFalso({ listarPorPaciente: vi.fn(async () => []) });
    const citas = await listarCitasPaciente(repo, "paciente-1");
    expect(citas).toEqual([]);
  });
});
