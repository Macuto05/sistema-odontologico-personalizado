import { describe, expect, it, vi } from "vitest";
import { editarHallazgo } from "@/application/use-cases/editarHallazgo";
import { eliminarHallazgo } from "@/application/use-cases/eliminarHallazgo";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { HallazgoDental, Odontograma } from "@/domain/entities/Odontograma";
import { CondicionInvalidaError } from "@/domain/errors";

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

function odontogramaRepoFalso(
  overrides: Partial<IOdontogramaRepository> = {},
): IOdontogramaRepository {
  return {
    obtenerOCrear: vi.fn(async () => odontogramaFalso()),
    editar: vi.fn(async (_id, datos) => ({
      odontograma: odontogramaFalso({ hallazgos: datos.hallazgos, version: 2 }),
      conflicto: false,
    })),
    ...overrides,
  };
}

function cambioRepoFalso(
  overrides: Partial<ICambioOdontogramaRepository> = {},
): ICambioOdontogramaRepository {
  return {
    registrar: vi.fn(async () => undefined),
    listarPorOdontograma: vi.fn(async () => []),
    ...overrides,
  };
}

const hallazgoSellante: HallazgoDental = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  condicionId: "SELLANTE",
  dientes: ["16"],
  superficie: "OCLUSAL_INCISAL",
  variante: null,
  estadoColor: "PENDIENTE",
  nota: null,
  registradoEn: "2026-01-01T00:00:00.000Z",
};

describe("editarHallazgo (US3, FR-008)", () => {
  it("cambia el estadoColor sin recrear el hallazgo (pendiente → realizado)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso({ hallazgos: [hallazgoSellante] });

    await editarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, hallazgoSellante.id, {
      condicionId: "SELLANTE",
      dientes: ["16"],
      superficie: "OCLUSAL_INCISAL",
      estadoColor: "REALIZADO",
    });

    const [, datosEnviados] = vi.mocked(odontogramaRepo.editar).mock.calls[0]!;
    expect(datosEnviados.hallazgos).toHaveLength(1);
    expect(datosEnviados.hallazgos[0]?.estadoColor).toBe("REALIZADO");
  });

  it("registra un CambioOdontograma tipo EDITADO", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso({ hallazgos: [hallazgoSellante] });

    await editarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, hallazgoSellante.id, {
      condicionId: "SELLANTE",
      dientes: ["16"],
      superficie: "OCLUSAL_INCISAL",
      estadoColor: "REALIZADO",
    });

    const [cambio] = vi.mocked(cambioRepo.registrar).mock.calls[0]!;
    expect(cambio.tipoCambio).toBe("EDITADO");
  });

  it("rechaza editar un hallazgo que no existe", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      editarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), "no-existe", {
        condicionId: "SELLANTE",
        dientes: ["16"],
        superficie: "OCLUSAL_INCISAL",
      }),
    ).rejects.toThrow(CondicionInvalidaError);
  });
});

describe("eliminarHallazgo (US3, FR-008)", () => {
  it("quita el hallazgo del array vigente", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso({ hallazgos: [hallazgoSellante] });

    await eliminarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, hallazgoSellante.id);

    const [, datosEnviados] = vi.mocked(odontogramaRepo.editar).mock.calls[0]!;
    expect(datosEnviados.hallazgos).toHaveLength(0);
  });

  it("registra un CambioOdontograma tipo ELIMINADO", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso({ hallazgos: [hallazgoSellante] });

    await eliminarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, hallazgoSellante.id);

    const [cambio] = vi.mocked(cambioRepo.registrar).mock.calls[0]!;
    expect(cambio.tipoCambio).toBe("ELIMINADO");
    expect(cambio.hallazgoId).toBe(hallazgoSellante.id);
  });

  it("rechaza eliminar un hallazgo que no existe", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      eliminarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), "no-existe"),
    ).rejects.toThrow(CondicionInvalidaError);
  });
});
