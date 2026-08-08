import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { editarInsumo } from "@/application/use-cases/editarInsumo";
import { IInsumoRepository } from "@/domain/repositories/IInsumoRepository";
import { crearInsumoDesdeDatos, estaAReponer } from "@/domain/entities/Insumo";
import { InsumoArchivadoError } from "@/domain/errors";

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

const insumoBase = crearInsumoDesdeDatos({
  id: ID,
  nombre: "Anestesia lidocaína",
  categoria: "Anestesia",
  stockActual: 20,
  stockMinimo: 5,
});

function repoFalso(overrides: Partial<IInsumoRepository> = {}): IInsumoRepository {
  return {
    crear: vi.fn(),
    buscar: vi.fn(async () => ({ insumos: [], total: 0 })),
    obtenerPorId: vi.fn(async () => insumoBase),
    listarCategorias: vi.fn(async () => []),
    contarAReponer: vi.fn(async () => 0),
    editar: vi.fn(async (_id, datos) => ({
      insumo: {
        ...insumoBase,
        nombre: datos.nombre,
        categoria: datos.categoria ?? null,
        stockActual: datos.stockActual,
        stockMinimo: datos.stockMinimo,
        version: insumoBase.version + 1,
      },
      conflicto: false,
    })),
    archivar: vi.fn(),
    reactivar: vi.fn(),
    ...overrides,
  };
}

const datosValidos = {
  nombre: "Anestesia lidocaína",
  categoria: "Anestesia",
  stockActual: 12,
  stockMinimo: 5,
  baseVersion: 1,
};

describe("editarInsumo", () => {
  it("actualiza el stock actual — así se registra una reposición o consumo (FR-011)", async () => {
    const repo = repoFalso();
    const { insumo } = await editarInsumo(repo, ID, { ...datosValidos, stockActual: 3 });
    expect(insumo.stockActual).toBe(3);
    expect(repo.editar).toHaveBeenCalledTimes(1);
  });

  it("incrementa la version en cada edición (detección de conflicto de sync)", async () => {
    const repo = repoFalso();
    const { insumo } = await editarInsumo(repo, ID, datosValidos);
    expect(insumo.version).toBe(insumoBase.version + 1);
  });

  it("recalcula 'a reponer' al bajar el stock por debajo del mínimo (FR-011)", async () => {
    const repo = repoFalso();
    expect(estaAReponer(insumoBase)).toBe(false);
    const { insumo } = await editarInsumo(repo, ID, { ...datosValidos, stockActual: 4 });
    expect(estaAReponer(insumo)).toBe(true);
  });

  it("deja de estar 'a reponer' al reponer stock por encima del mínimo (FR-011)", async () => {
    const repo = repoFalso();
    const { insumo } = await editarInsumo(repo, ID, { ...datosValidos, stockActual: 50 });
    expect(estaAReponer(insumo)).toBe(false);
  });

  it("propaga InsumoArchivadoError: un archivado no se edita sin reactivar (FR-012)", async () => {
    const repo = repoFalso({
      editar: vi.fn(async () => {
        throw new InsumoArchivadoError();
      }),
    });
    await expect(editarInsumo(repo, ID, datosValidos)).rejects.toThrow(InsumoArchivadoError);
  });

  it("rechaza un stock negativo antes de tocar el repositorio (FR-003)", async () => {
    const repo = repoFalso();
    await expect(
      editarInsumo(repo, ID, { ...datosValidos, stockActual: -3 }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });

  it("rechaza si falta baseVersion — sin ella no hay detección de conflicto", async () => {
    const repo = repoFalso();
    await expect(
      editarInsumo(repo, ID, {
        nombre: datosValidos.nombre,
        categoria: datosValidos.categoria,
        stockActual: datosValidos.stockActual,
        stockMinimo: datosValidos.stockMinimo,
      }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });
});
