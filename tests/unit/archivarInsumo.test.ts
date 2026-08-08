import { describe, expect, it, vi } from "vitest";
import { archivarInsumo } from "@/application/use-cases/archivarInsumo";
import { reactivarInsumo } from "@/application/use-cases/reactivarInsumo";
import { IInsumoRepository } from "@/domain/repositories/IInsumoRepository";
import { Insumo, crearInsumoDesdeDatos } from "@/domain/entities/Insumo";
import { InsumoNoEstaArchivadoError } from "@/domain/errors";

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

const activo = crearInsumoDesdeDatos({
  id: ID,
  nombre: "Guantes",
  stockActual: 2,
  stockMinimo: 10,
});
const archivado: Insumo = { ...activo, estado: "ARCHIVADO" };

/** Repo en memoria con la misma semántica de estado que las implementaciones reales. */
function repoConEstado(inicial: Insumo): IInsumoRepository {
  let actual = inicial;
  return {
    crear: vi.fn(),
    buscar: vi.fn(async () => ({ insumos: [], total: 0 })),
    obtenerPorId: vi.fn(async () => actual),
    listarCategorias: vi.fn(async () => []),
    // FR-010: un archivado nunca cuenta como "a reponer", aunque su stock esté bajo.
    contarAReponer: vi.fn(async () => (actual.estado === "ACTIVO" ? 1 : 0)),
    editar: vi.fn(),
    archivar: vi.fn(async () => {
      if (actual.estado === "ARCHIVADO") return { insumo: actual, yaEstabaArchivado: true };
      actual = { ...actual, estado: "ARCHIVADO" };
      return { insumo: actual, yaEstabaArchivado: false };
    }),
    reactivar: vi.fn(async () => {
      if (actual.estado === "ACTIVO") throw new InsumoNoEstaArchivadoError();
      actual = { ...actual, estado: "ACTIVO" };
      return actual;
    }),
  };
}

describe("archivarInsumo", () => {
  it("archiva un insumo activo conservando todos sus datos (FR-013, FR-015)", async () => {
    const repo = repoConEstado(activo);
    const { insumo, yaEstabaArchivado } = await archivarInsumo(repo, ID);
    expect(insumo.estado).toBe("ARCHIVADO");
    expect(yaEstabaArchivado).toBe(false);
    expect(insumo.nombre).toBe(activo.nombre);
    expect(insumo.stockActual).toBe(activo.stockActual);
    expect(insumo.stockMinimo).toBe(activo.stockMinimo);
  });

  it("archivar uno ya archivado informa el estado, no falla (spec §Edge Cases)", async () => {
    const repo = repoConEstado(archivado);
    const { insumo, yaEstabaArchivado } = await archivarInsumo(repo, ID);
    expect(yaEstabaArchivado).toBe(true);
    expect(insumo.estado).toBe("ARCHIVADO");
  });

  it("un insumo archivado deja de contarse como a reponer (FR-010, US2-AC4)", async () => {
    const repo = repoConEstado(activo);
    expect(await repo.contarAReponer()).toBe(1);
    await archivarInsumo(repo, ID);
    expect(await repo.contarAReponer()).toBe(0);
  });
});

describe("reactivarInsumo", () => {
  it("reactiva un insumo archivado con sus datos intactos (FR-014)", async () => {
    const repo = repoConEstado(archivado);
    const insumo = await reactivarInsumo(repo, ID);
    expect(insumo.estado).toBe("ACTIVO");
    expect(insumo.stockActual).toBe(activo.stockActual);
  });

  it("vuelve a contarse como a reponer tras reactivarlo (FR-014)", async () => {
    const repo = repoConEstado(archivado);
    expect(await repo.contarAReponer()).toBe(0);
    await reactivarInsumo(repo, ID);
    expect(await repo.contarAReponer()).toBe(1);
  });

  it("rechaza reactivar uno que ya está activo", async () => {
    const repo = repoConEstado(activo);
    await expect(reactivarInsumo(repo, ID)).rejects.toThrow(InsumoNoEstaArchivadoError);
  });
});
