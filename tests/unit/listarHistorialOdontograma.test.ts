import { describe, expect, it, vi } from "vitest";
import { listarHistorialOdontograma } from "@/application/use-cases/listarHistorialOdontograma";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";

function cambioFalso(overrides: Partial<CambioOdontograma> = {}): CambioOdontograma {
  return {
    id: "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01",
    odontogramaId: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    denticion: "ADULTO",
    tipoCambio: "AGREGADO",
    hallazgoId: "h1",
    notaId: null,
    dientes: ["16"],
    superficie: null,
    descripcion: "Ausente agregada en el diente 16",
    snapshot: null,
    registradoEn: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(overrides: Partial<ICambioOdontogramaRepository> = {}): ICambioOdontogramaRepository {
  return {
    registrar: vi.fn(async () => undefined),
    listarPorOdontograma: vi.fn(async () => [cambioFalso()]),
    ...overrides,
  };
}

describe("listarHistorialOdontograma (US4, FR-009, FR-010)", () => {
  it("delega en el repositorio con el odontogramaId indicado", async () => {
    const repo = repoFalso();
    const cambios = await listarHistorialOdontograma(repo, {
      odontogramaId: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    });
    expect(cambios).toHaveLength(1);
    expect(repo.listarPorOdontograma).toHaveBeenCalledWith(
      "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
      { pagina: undefined, limite: undefined },
    );
  });

  it("devuelve vacío cuando no hay cambios registrados", async () => {
    const repo = repoFalso({ listarPorOdontograma: vi.fn(async () => []) });
    const cambios = await listarHistorialOdontograma(repo, {
      odontogramaId: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    });
    expect(cambios).toEqual([]);
  });

  it("rechaza un odontogramaId inválido antes de tocar el repositorio", async () => {
    const repo = repoFalso();
    await expect(
      listarHistorialOdontograma(repo, { odontogramaId: "no-es-un-uuid" }),
    ).rejects.toThrow();
    expect(repo.listarPorOdontograma).not.toHaveBeenCalled();
  });
});
