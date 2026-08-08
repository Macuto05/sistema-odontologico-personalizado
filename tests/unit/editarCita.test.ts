import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { editarCita } from "@/application/use-cases/editarCita";
import { ICitaRepository } from "@/domain/repositories/ICitaRepository";
import { Cita } from "@/domain/entities/Cita";
import { CitaFinalizadaError } from "@/domain/errors";

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
    editar: vi.fn(async (_id, datos) => ({
      cita: citaFalsa({ ...datos, version: 2 }),
      conflicto: false,
    })),
    finalizar: vi.fn(async () => ({ cita: citaFalsa(), conflicto: false })),
    ...overrides,
  };
}

describe("editarCita — Diagnóstico (US2, FR-005, FR-006)", () => {
  it("guarda motivo, diagnóstico y categoría (FR-005, FR-006)", async () => {
    const repo = repoFalso();
    const { cita } = await editarCita(repo, citaFalsa().id, {
      motivoConsulta: "Dolor en molar",
      diagnostico: "Caries profunda",
      categoria: "URGENCIA",
      baseVersion: 1,
    });
    expect(cita.motivoConsulta).toBe("Dolor en molar");
    expect(cita.categoria).toBe("URGENCIA");
    expect(repo.editar).toHaveBeenCalledTimes(1);
  });

  it("permite guardar con motivo, diagnóstico y categoría vacíos (ninguno es obligatorio)", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, {
        motivoConsulta: "",
        diagnostico: "",
        categoria: null,
        baseVersion: 1,
      }),
    ).resolves.toBeDefined();
  });

  it("rechaza datos sin baseVersion antes de tocar el repositorio", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, { motivoConsulta: "Control de rutina" }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });

  it("propaga CitaFinalizadaError si el repositorio la lanza (research.md #10)", async () => {
    const repo = repoFalso({
      editar: vi.fn(async () => {
        throw new CitaFinalizadaError();
      }),
    });
    await expect(
      editarCita(repo, citaFalsa().id, { diagnostico: "No debería aplicarse", baseVersion: 1 }),
    ).rejects.toThrow(CitaFinalizadaError);
  });
});

describe("editarCita — Receta (US3, FR-007, FR-008)", () => {
  const itemValido = {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a3",
    medicamento: "Amoxicilina",
    dosis: "500mg",
    frecuencia: "cada 8 horas",
    duracion: "7 días",
    indicaciones: null,
  };

  it("agrega un ítem de receta con sus campos obligatorios (FR-007)", async () => {
    const repo = repoFalso();
    const { cita } = await editarCita(repo, citaFalsa().id, {
      recetaItems: [itemValido],
      baseVersion: 1,
    });
    expect(cita.recetaItems).toEqual([itemValido]);
  });

  it("permite guardar una receta vacía (no es obligatoria, User Story 3 escenario 3)", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, { recetaItems: [], baseVersion: 1 }),
    ).resolves.toBeDefined();
  });

  it("rechaza un ítem sin medicamento, dosis, frecuencia o duración (FR-007)", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, {
        recetaItems: [{ ...itemValido, medicamento: "" }],
        baseVersion: 1,
      }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });
});

describe("editarCita — Estudios complementarios (US4, FR-009, FR-010)", () => {
  const estudioValido = {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a4",
    nombre: "Radiografía panorámica",
  };

  it("agrega un estudio complementario con nombre (FR-009)", async () => {
    const repo = repoFalso();
    const { cita } = await editarCita(repo, citaFalsa().id, {
      estudioItems: [estudioValido],
      baseVersion: 1,
    });
    expect(cita.estudioItems[0]?.nombre).toBe("Radiografía panorámica");
  });

  it("permite guardar sin ningún estudio (User Story 4 escenario 3)", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, { estudioItems: [], baseVersion: 1 }),
    ).resolves.toBeDefined();
  });

  it("rechaza un estudio sin nombre (FR-009)", async () => {
    const repo = repoFalso();
    await expect(
      editarCita(repo, citaFalsa().id, {
        estudioItems: [{ ...estudioValido, nombre: "" }],
        baseVersion: 1,
      }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });
});
