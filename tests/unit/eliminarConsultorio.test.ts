import { describe, expect, it, vi } from "vitest";
import { eliminarConsultorio } from "@/application/use-cases/eliminarConsultorio";
import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";

function repoFalso(overrides: Partial<IConsultorioRepository> = {}): IConsultorioRepository {
  return {
    crear: vi.fn(),
    listar: vi.fn(async () => []),
    obtenerPorId: vi.fn(async () => null),
    eliminar: vi.fn(async () => {}),
    ...overrides,
  };
}

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

describe("eliminarConsultorio", () => {
  it("delega en el repositorio con el id correcto (FR-004)", async () => {
    const repo = repoFalso();
    await eliminarConsultorio(repo, ID);
    expect(repo.eliminar).toHaveBeenCalledWith(ID);
  });

  it("es idempotente: eliminar un id que ya no existe no lanza error (FR-004, research.md #2)", async () => {
    // El repositorio (Dexie/Prisma) ya garantiza esto — el caso de uso no agrega su
    // propia validación de existencia, solo delega.
    const repo = repoFalso({ eliminar: vi.fn(async () => {}) });
    await expect(eliminarConsultorio(repo, "id-inexistente")).resolves.toBeUndefined();
  });
});
