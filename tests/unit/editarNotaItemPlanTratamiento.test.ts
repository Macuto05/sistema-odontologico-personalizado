import { describe, expect, it, vi } from "vitest";
import { editarNotaItemPlanTratamiento } from "@/application/use-cases/editarNotaItemPlanTratamiento";
import { IItemPlanTratamientoRepository } from "@/domain/repositories/IItemPlanTratamientoRepository";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";

function itemFalso(overrides: Partial<ItemPlanTratamiento> = {}): ItemPlanTratamiento {
  return {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    fecha: "2026-01-01",
    diente: "16",
    tratamiento: "Obturación",
    fechaRealizado: null,
    nota: null,
    version: 1,
    conflictoPendiente: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(
  overrides: Partial<IItemPlanTratamientoRepository> = {},
): IItemPlanTratamientoRepository {
  return {
    crear: vi.fn(async (datos) => itemFalso({ ...datos, diente: datos.diente ?? null })),
    editar: vi.fn(async () => ({ item: itemFalso(), conflicto: false })),
    eliminar: vi.fn(async () => undefined),
    listarPorPaciente: vi.fn(async () => [itemFalso()]),
    ...overrides,
  };
}

describe("editarNotaItemPlanTratamiento (009-planes-tratamiento, US4, FR-008)", () => {
  it("guarda el texto de la nota", async () => {
    const repo = repoFalso();

    await editarNotaItemPlanTratamiento(repo, itemFalso().id, "Paciente pospuso el turno", 1);

    expect(repo.editar).toHaveBeenCalledWith(
      itemFalso().id,
      expect.objectContaining({ nota: "Paciente pospuso el turno", baseVersion: 1 }),
    );
  });

  it("normaliza texto vacío/solo espacios a null", async () => {
    const repo = repoFalso();

    await editarNotaItemPlanTratamiento(repo, itemFalso().id, "   ", 1);

    expect(repo.editar).toHaveBeenCalledWith(
      itemFalso().id,
      expect.objectContaining({ nota: null, baseVersion: 1 }),
    );
  });

  it("no reenvía ningún otro campo del plan (FR-010)", async () => {
    const repo = repoFalso();

    await editarNotaItemPlanTratamiento(repo, itemFalso().id, "algo", 1);

    const [, datos] = vi.mocked(repo.editar).mock.calls[0]!;
    expect(datos.fecha).toBeUndefined();
    expect(datos.diente).toBeUndefined();
    expect(datos.tratamiento).toBeUndefined();
    expect(datos.fechaRealizado).toBeUndefined();
  });
});
