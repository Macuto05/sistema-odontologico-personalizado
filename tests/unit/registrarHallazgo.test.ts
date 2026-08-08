import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { registrarHallazgo } from "@/application/use-cases/registrarHallazgo";
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

const hallazgoBase = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  dientes: ["16"],
  registradoEn: "2026-01-01T00:00:00.000Z",
};

const hallazgoExistente: HallazgoDental = {
  id: "existente",
  condicionId: "AUSENTE",
  dientes: ["11"],
  superficie: null,
  variante: null,
  estadoColor: null,
  nota: null,
  registradoEn: "2026-01-01T00:00:00.000Z",
};

describe("registrarHallazgo (US1, FR-003 a FR-007, FR-009, FR-012 a FR-015, FR-020)", () => {
  it("agrega el hallazgo al array vigente sin reemplazar los existentes (FR-020)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso({ hallazgos: [hallazgoExistente] });

    await registrarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, {
      ...hallazgoBase,
      condicionId: "CARIES",
      superficie: "OCLUSAL_INCISAL",
    });

    expect(odontogramaRepo.editar).toHaveBeenCalledWith(
      odontograma.id,
      expect.objectContaining({
        baseVersion: 1,
        hallazgos: expect.arrayContaining([
          hallazgoExistente,
          expect.objectContaining({ condicionId: "CARIES" }),
        ]),
      }),
    );
  });

  it("registra un CambioOdontograma tipo AGREGADO en la misma operación (FR-009)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    const odontograma = odontogramaFalso();

    await registrarHallazgo({ odontogramaRepo, cambioRepo }, odontograma, {
      ...hallazgoBase,
      condicionId: "AUSENTE",
    });

    expect(cambioRepo.registrar).toHaveBeenCalledTimes(1);
    const [cambio] = vi.mocked(cambioRepo.registrar).mock.calls[0]!;
    expect(cambio.tipoCambio).toBe("AGREGADO");
    expect(cambio.odontogramaId).toBe(odontograma.id);
  });

  it("rechaza superficie cuando la condición aplica a diente completo (Ausente)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "AUSENTE",
        superficie: "OCLUSAL_INCISAL",
      }),
    ).rejects.toThrow(ZodError);
    expect(odontogramaRepo.editar).not.toHaveBeenCalled();
  });

  it("exige superficie cuando la condición aplica a superficie (Caries)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "CARIES",
      }),
    ).rejects.toThrow(ZodError);
  });

  it("exige una variante válida cuando la condición la requiere (Exudado)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "EXUDADO",
      }),
    ).rejects.toThrow(ZodError);

    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "EXUDADO",
        variante: "PURULENTO",
      }),
    ).resolves.toBeDefined();
  });

  it("rechaza más de un diente cuando la condición no es multiDiente", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "CARIES",
        superficie: "OCLUSAL_INCISAL",
        dientes: ["16", "17"],
      }),
    ).rejects.toThrow(ZodError);
  });

  it("permite multi-diente para Puente fijo (FR-013)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
        ...hallazgoBase,
        condicionId: "PUENTE_FIJO",
        dientes: ["15", "17"],
      }),
    ).resolves.toBeDefined();
  });

  it("rechaza Pulpotomía/Pulpectomía en la vista Adulto (FR-012)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo(
        { odontogramaRepo, cambioRepo },
        odontogramaFalso({ denticion: "ADULTO" }),
        { ...hallazgoBase, condicionId: "PULPOTOMIA" },
      ),
    ).rejects.toThrow(CondicionInvalidaError);
  });

  it("permite Pulpotomía en la vista Niño (FR-012)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await expect(
      registrarHallazgo(
        { odontogramaRepo, cambioRepo },
        odontogramaFalso({ denticion: "NINO" }),
        { ...hallazgoBase, condicionId: "PULPOTOMIA" },
      ),
    ).resolves.toBeDefined();
  });

  it("por defecto marca PENDIENTE una condición que admite estado y no especifica ninguno", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
      ...hallazgoBase,
      condicionId: "SELLANTE",
      superficie: "OCLUSAL_INCISAL",
    });
    const [, datosEnviados] = vi.mocked(odontogramaRepo.editar).mock.calls[0]!;
    expect(datosEnviados.hallazgos[0]?.estadoColor).toBe("PENDIENTE");
  });

  it("permite agregar una nota de texto libre opcional (FR-007)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const cambioRepo = cambioRepoFalso();
    await registrarHallazgo({ odontogramaRepo, cambioRepo }, odontogramaFalso(), {
      ...hallazgoBase,
      condicionId: "AUSENTE",
      nota: "Extracción hace 2 años",
    });
    const [, datosEnviados] = vi.mocked(odontogramaRepo.editar).mock.calls[0]!;
    expect(datosEnviados.hallazgos[0]?.nota).toBe("Extracción hace 2 años");
  });
});
