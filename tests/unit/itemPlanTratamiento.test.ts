import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { crearItemPlanTratamiento } from "@/application/use-cases/crearItemPlanTratamiento";
import { editarItemPlanTratamiento } from "@/application/use-cases/editarItemPlanTratamiento";
import { eliminarItemPlanTratamiento } from "@/application/use-cases/eliminarItemPlanTratamiento";
import { listarPlanTratamiento } from "@/application/use-cases/listarPlanTratamiento";
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

describe("crearItemPlanTratamiento (US5, FR-016)", () => {
  it("exige tratamiento no vacío", async () => {
    const repo = repoFalso();
    await expect(
      crearItemPlanTratamiento(repo, itemFalso().pacienteId, itemFalso().id, {
        fecha: "2026-01-01",
        tratamiento: "",
      }),
    ).rejects.toThrow(ZodError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("permite diente vacío para tratamientos generales (spec Edge Cases)", async () => {
    const repo = repoFalso();
    const item = await crearItemPlanTratamiento(repo, itemFalso().pacienteId, itemFalso().id, {
      fecha: "2026-01-01",
      tratamiento: "Limpieza general",
    });
    expect(item).toBeDefined();
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tratamiento: "Limpieza general" }),
    );
  });
});

describe("editarItemPlanTratamiento (US5)", () => {
  it("delega en el repositorio con baseVersion", async () => {
    const repo = repoFalso();
    await editarItemPlanTratamiento(repo, itemFalso().id, {
      tratamiento: "Obturación revisada",
      baseVersion: 1,
    });
    expect(repo.editar).toHaveBeenCalledWith(
      itemFalso().id,
      expect.objectContaining({ tratamiento: "Obturación revisada", baseVersion: 1 }),
    );
  });
});

describe("eliminarItemPlanTratamiento (US5)", () => {
  it("delega en el repositorio", async () => {
    const repo = repoFalso();
    await eliminarItemPlanTratamiento(repo, { id: itemFalso().id, baseVersion: 1 });
    expect(repo.eliminar).toHaveBeenCalledWith(itemFalso().id, 1);
  });
});

describe("listarPlanTratamiento (US5)", () => {
  it("delega en el repositorio", async () => {
    const repo = repoFalso();
    const items = await listarPlanTratamiento(repo, { pacienteId: itemFalso().pacienteId });
    expect(items).toHaveLength(1);
  });
});
