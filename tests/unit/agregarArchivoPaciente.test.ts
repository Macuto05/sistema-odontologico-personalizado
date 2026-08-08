import { describe, expect, it, vi } from "vitest";
import { agregarArchivoPaciente } from "@/application/use-cases/agregarArchivoPaciente";
import { IArchivoPacienteRepository } from "@/domain/repositories/IArchivoPacienteRepository";
import {
  ArchivoDemasiadoGrandeError,
  PacienteNoEncontradoError,
  TipoArchivoNoSoportadoError,
} from "@/domain/errors";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/domain/constants";
import { ArchivoPaciente } from "@/domain/entities/ArchivoPaciente";

const PACIENTE_ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a2";

function archivoFalso(overrides: Partial<ArchivoPaciente> = {}): ArchivoPaciente {
  return {
    id: "archivo-1",
    pacienteId: PACIENTE_ID,
    nombreArchivo: "radiografia.jpg",
    tipo: "IMAGEN",
    tamanoBytes: 3,
    contenido: new Uint8Array([1, 2, 3]),
    createdAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(
  overrides: Partial<IArchivoPacienteRepository> = {},
): IArchivoPacienteRepository {
  return {
    agregar: vi.fn(async () => archivoFalso()),
    listar: vi.fn(async () => []),
    obtenerContenido: vi.fn(async () => archivoFalso()),
    eliminar: vi.fn(async () => {}),
    ...overrides,
  };
}

const datosBase = {
  pacienteId: PACIENTE_ID,
  nombreArchivo: "radiografia.jpg",
  contenido: new Uint8Array([1, 2, 3]),
};

describe("agregarArchivoPaciente", () => {
  it("resuelve tipo IMAGEN a partir de un Content-Type image/* (FR-001)", async () => {
    const repo = repoFalso();
    await agregarArchivoPaciente(repo, { ...datosBase, tipoMime: "image/jpeg" });
    expect(repo.agregar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "IMAGEN" }));
  });

  it("resuelve tipo PDF a partir de application/pdf (FR-001)", async () => {
    const repo = repoFalso();
    await agregarArchivoPaciente(repo, { ...datosBase, tipoMime: "application/pdf" });
    expect(repo.agregar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "PDF" }));
  });

  it("rechaza un tipo no soportado antes de tocar el repositorio (FR-001)", async () => {
    const repo = repoFalso();
    await expect(
      agregarArchivoPaciente(repo, { ...datosBase, tipoMime: "application/msword" }),
    ).rejects.toThrow(TipoArchivoNoSoportadoError);
    expect(repo.agregar).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que supera el tamaño máximo, sin tocar el repositorio (FR-010)", async () => {
    const repo = repoFalso();
    await expect(
      agregarArchivoPaciente(repo, {
        ...datosBase,
        tipoMime: "image/png",
        contenido: new Uint8Array(TAMANO_MAXIMO_ARCHIVO_BYTES + 1),
      }),
    ).rejects.toThrow(ArchivoDemasiadoGrandeError);
    expect(repo.agregar).not.toHaveBeenCalled();
  });

  it("acepta un archivo exactamente en el límite de tamaño (FR-010, borde)", async () => {
    const repo = repoFalso();
    await agregarArchivoPaciente(repo, {
      ...datosBase,
      tipoMime: "image/png",
      contenido: new Uint8Array(TAMANO_MAXIMO_ARCHIVO_BYTES),
    });
    expect(repo.agregar).toHaveBeenCalled();
  });

  it("propaga PacienteNoEncontradoError si el repositorio lo lanza", async () => {
    const repo = repoFalso({
      agregar: vi.fn(async () => {
        throw new PacienteNoEncontradoError(PACIENTE_ID);
      }),
    });
    await expect(
      agregarArchivoPaciente(repo, { ...datosBase, tipoMime: "image/png" }),
    ).rejects.toThrow(PacienteNoEncontradoError);
  });
});
