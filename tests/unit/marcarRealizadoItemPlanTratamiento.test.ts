import { describe, expect, it, vi } from "vitest";
import { marcarRealizadoItemPlanTratamiento } from "@/application/use-cases/marcarRealizadoItemPlanTratamiento";
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

describe("marcarRealizadoItemPlanTratamiento (009-planes-tratamiento, US2, FR-004 a FR-007)", () => {
  it("al marcar realizado, completa fechaRealizado con la fecha de hoy — no la recibe como parámetro", async () => {
    const repo = repoFalso();
    const antes = new Date().toISOString().slice(0, 10);

    await marcarRealizadoItemPlanTratamiento(repo, itemFalso().id, true, 1);

    expect(repo.editar).toHaveBeenCalledTimes(1);
    const [id, datos] = vi.mocked(repo.editar).mock.calls[0]!;
    expect(id).toBe(itemFalso().id);
    expect(datos.baseVersion).toBe(1);
    expect(datos.fechaRealizado).toBe(antes);
    // No debe reenviar ningún otro campo del plan (FR-010).
    expect(datos.fecha).toBeUndefined();
    expect(datos.diente).toBeUndefined();
    expect(datos.tratamiento).toBeUndefined();
    expect(datos.nota).toBeUndefined();
  });

  it("al desmarcar, vacía fechaRealizado", async () => {
    const repo = repoFalso();

    await marcarRealizadoItemPlanTratamiento(repo, itemFalso().id, false, 2);

    expect(repo.editar).toHaveBeenCalledWith(
      itemFalso().id,
      expect.objectContaining({ fechaRealizado: null, baseVersion: 2 }),
    );
  });

  it("la firma no acepta ninguna fecha elegida por quien llama (research.md #4)", () => {
    // Verificación de tipo — si `marcarRealizadoItemPlanTratamiento` alguna vez aceptara un
    // tercer parámetro de fecha en vez de un booleano, esto no compilaría.
    expect(marcarRealizadoItemPlanTratamiento.length).toBe(4);
  });
});
