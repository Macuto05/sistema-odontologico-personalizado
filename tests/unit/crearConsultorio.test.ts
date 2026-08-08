import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { crearConsultorio } from "@/application/use-cases/crearConsultorio";
import { IConsultorioRepository } from "@/domain/repositories/IConsultorioRepository";
import { NombreConsultorioDuplicadoError } from "@/domain/errors";

function repoFalso(overrides: Partial<IConsultorioRepository> = {}): IConsultorioRepository {
  return {
    crear: vi.fn(async (datos) => ({ ...datos, createdAt: "2026-01-01T00:00:00.000Z" })),
    listar: vi.fn(async () => []),
    obtenerPorId: vi.fn(async () => null),
    eliminar: vi.fn(async () => {}),
    ...overrides,
  };
}

const datosValidos = { id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b", nombre: "Sede Norte" };

describe("crearConsultorio", () => {
  it("crea un consultorio con nombre válido (FR-001)", async () => {
    const repo = repoFalso();
    const consultorio = await crearConsultorio(repo, datosValidos);
    expect(consultorio.nombre).toBe("Sede Norte");
    expect(repo.crear).toHaveBeenCalledTimes(1);
  });

  it("rechaza un nombre vacío (FR-002)", async () => {
    const repo = repoFalso();
    await expect(crearConsultorio(repo, { ...datosValidos, nombre: "" })).rejects.toThrow(ZodError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("propaga NombreConsultorioDuplicadoError si el repositorio lo detecta (FR-003)", async () => {
    const existente = { id: "otro-id", nombre: "Sede Norte", createdAt: "2026-01-01T00:00:00.000Z" };
    const repo = repoFalso({
      crear: vi.fn(async () => {
        throw new NombreConsultorioDuplicadoError(existente);
      }),
    });
    await expect(crearConsultorio(repo, datosValidos)).rejects.toThrow(NombreConsultorioDuplicadoError);
  });
});
