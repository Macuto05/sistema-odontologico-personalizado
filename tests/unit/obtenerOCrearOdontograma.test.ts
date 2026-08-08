import { describe, expect, it, vi } from "vitest";
import { obtenerOCrearOdontograma } from "@/application/use-cases/obtenerOCrearOdontograma";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { Odontograma } from "@/domain/entities/Odontograma";

function odontogramaFalso(overrides: Partial<Odontograma> = {}): Odontograma {
  return {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    denticion: "ADULTO",
    hallazgos: [],
    notas: [],
    version: 1,
    conflictoPendiente: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(overrides: Partial<IOdontogramaRepository> = {}): IOdontogramaRepository {
  return {
    obtenerOCrear: vi.fn(async (datos) =>
      odontogramaFalso({ id: datos.id, pacienteId: datos.pacienteId, denticion: datos.denticion }),
    ),
    editar: vi.fn(async () => ({ odontograma: odontogramaFalso(), conflicto: false })),
    ...overrides,
  };
}

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

describe("obtenerOCrearOdontograma (US1, US2, research.md #10)", () => {
  it("crea vacío la primera vez para (pacienteId, denticion), usando el id dado", async () => {
    const repo = repoFalso();
    const odontograma = await obtenerOCrearOdontograma(repo, {
      id: ID,
      pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
      denticion: "ADULTO",
    });
    expect(odontograma.hallazgos).toEqual([]);
    expect(repo.obtenerOCrear).toHaveBeenCalledWith({
      id: ID,
      pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
      denticion: "ADULTO",
    });
  });

  it("devuelve el existente sin crear uno nuevo cuando ya hay uno", async () => {
    const existente = odontogramaFalso({
      hallazgos: [
        {
          id: "h1",
          condicionId: "CARIES",
          dientes: ["16"],
          superficie: "OCLUSAL_INCISAL",
          variante: null,
          estadoColor: null,
          nota: null,
          registradoEn: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const repo = repoFalso({ obtenerOCrear: vi.fn(async () => existente) });
    const odontograma = await obtenerOCrearOdontograma(repo, {
      id: ID,
      pacienteId: existente.pacienteId,
      denticion: "ADULTO",
    });
    expect(odontograma.hallazgos).toHaveLength(1);
  });

  it("rechaza datos inválidos antes de tocar el repositorio", async () => {
    const repo = repoFalso();
    await expect(
      obtenerOCrearOdontograma(repo, {
        id: ID,
        pacienteId: "no-es-un-uuid",
        denticion: "ADULTO",
      }),
    ).rejects.toThrow();
    expect(repo.obtenerOCrear).not.toHaveBeenCalled();
  });
});
