import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { crearInsumo } from "@/application/use-cases/crearInsumo";
import { IInsumoRepository } from "@/domain/repositories/IInsumoRepository";
import { crearInsumoDesdeDatos } from "@/domain/entities/Insumo";

function repoFalso(overrides: Partial<IInsumoRepository> = {}): IInsumoRepository {
  return {
    crear: vi.fn(async (datos) => crearInsumoDesdeDatos(datos)),
    buscar: vi.fn(async () => ({ insumos: [], total: 0 })),
    obtenerPorId: vi.fn(async () => null),
    listarCategorias: vi.fn(async () => []),
    contarAReponer: vi.fn(async () => 0),
    editar: vi.fn(),
    archivar: vi.fn(),
    reactivar: vi.fn(),
    ...overrides,
  };
}

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombre: "Guantes de nitrilo talla M",
  categoria: "Desechables",
  stockActual: 20,
  stockMinimo: 5,
};

describe("crearInsumo", () => {
  it("crea un insumo con datos válidos (FR-001)", async () => {
    const repo = repoFalso();
    const insumo = await crearInsumo(repo, datosValidos);
    expect(insumo.estado).toBe("ACTIVO");
    expect(insumo.nombre).toBe("Guantes de nitrilo talla M");
    expect(insumo.stockActual).toBe(20);
    expect(insumo.version).toBe(1);
    expect(repo.crear).toHaveBeenCalledTimes(1);
  });

  it("acepta un insumo sin categoría — es opcional (FR-002)", async () => {
    const repo = repoFalso();
    const insumo = await crearInsumo(repo, {
      id: datosValidos.id,
      nombre: datosValidos.nombre,
      stockActual: datosValidos.stockActual,
      stockMinimo: datosValidos.stockMinimo,
    });
    expect(insumo.categoria).toBeNull();
  });

  it("rechaza si falta el nombre (FR-002)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, nombre: "" })).rejects.toThrow(ZodError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("rechaza si falta el stock actual (FR-002)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, stockActual: null })).rejects.toThrow(
      ZodError,
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("rechaza si falta el stock mínimo (FR-002)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, stockMinimo: null })).rejects.toThrow(
      ZodError,
    );
  });

  it("rechaza un stock actual negativo (FR-003)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, stockActual: -1 })).rejects.toThrow(
      ZodError,
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("rechaza un stock mínimo negativo (FR-003)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, stockMinimo: -5 })).rejects.toThrow(
      ZodError,
    );
  });

  it("rechaza un stock no entero (FR-003)", async () => {
    const repo = repoFalso();
    await expect(crearInsumo(repo, { ...datosValidos, stockActual: 2.5 })).rejects.toThrow(
      ZodError,
    );
  });

  it("acepta stock mínimo en cero — 'avisar solo si se agota' (spec §Edge Cases)", async () => {
    const repo = repoFalso();
    const insumo = await crearInsumo(repo, { ...datosValidos, stockMinimo: 0 });
    expect(insumo.stockMinimo).toBe(0);
  });

  it("no valida unicidad de nombre: dos insumos pueden llamarse igual (spec §Edge Cases)", async () => {
    const repo = repoFalso();
    await crearInsumo(repo, datosValidos);
    await crearInsumo(repo, { ...datosValidos, id: "c4f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c" });
    expect(repo.crear).toHaveBeenCalledTimes(2);
  });
});
