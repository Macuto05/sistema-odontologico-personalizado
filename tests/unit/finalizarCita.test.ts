import { describe, expect, it, vi } from "vitest";
import { finalizarCita } from "@/application/use-cases/finalizarCita";
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
    crearOAbrir: vi.fn(async () => citaFalsa()),
    obtenerPorId: vi.fn(async () => citaFalsa()),
    listarPorPaciente: vi.fn(async () => []),
    editar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    finalizar: vi.fn(async () => ({
      cita: citaFalsa({ estado: "FINALIZADA", finalizadaEn: "2026-01-02T00:00:00.000Z" }),
      conflicto: false,
    })),
    ...overrides,
  };
}

describe("finalizarCita (US6, FR-014)", () => {
  it("marca la cita como finalizada", async () => {
    const repo = repoFalso();
    const { cita } = await finalizarCita(repo, citaFalsa().id, 1);
    expect(cita.estado).toBe("FINALIZADA");
    expect(cita.finalizadaEn).not.toBeNull();
    expect(repo.finalizar).toHaveBeenCalledWith(citaFalsa().id, 1);
  });

  it("delega en el repositorio la idempotencia de finalizar una cita ya finalizada (research.md #6, #7)", async () => {
    const yaFinalizada = citaFalsa({ estado: "FINALIZADA", finalizadaEn: "2026-01-01T01:00:00.000Z" });
    const repo = repoFalso({
      finalizar: vi.fn(async () => ({ cita: yaFinalizada, conflicto: false })),
    });
    const { cita } = await finalizarCita(repo, yaFinalizada.id, 5);
    expect(cita).toEqual(yaFinalizada);
  });
});
