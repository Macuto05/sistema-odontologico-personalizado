import { describe, expect, it, vi } from "vitest";
import { agregarArchivoEstudio } from "@/application/use-cases/agregarArchivoEstudio";
import { IArchivoEstudioRepository } from "@/domain/repositories/IArchivoEstudioRepository";
import {
  TipoArchivoNoSoportadoError,
  EstudioNoEncontradoError,
  ArchivoDemasiadoGrandeError,
} from "@/domain/errors";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/domain/constants";
import { Cita } from "@/domain/entities/Cita";
import { ArchivoEstudio } from "@/domain/entities/ArchivoEstudio";

function citaFalsa(overrides: Partial<Cita> = {}): Cita {
  return {
    id: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    pacienteId: "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
    estado: "FINALIZADA",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [{ id: "estudio-1", nombre: "Radiografía", motivo: null, archivos: [] }],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function archivoFalso(overrides: Partial<ArchivoEstudio> = {}): ArchivoEstudio {
  return {
    id: "archivo-1",
    citaId: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
    estudioItemId: "estudio-1",
    nombreArchivo: "radiografia.jpg",
    tipo: "IMAGEN",
    contenido: new Uint8Array([1, 2, 3]),
    createdAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(overrides: Partial<IArchivoEstudioRepository> = {}): IArchivoEstudioRepository {
  return {
    agregar: vi.fn(async () => ({ archivo: archivoFalso(), cita: citaFalsa() })),
    obtenerContenido: vi.fn(async () => archivoFalso()),
    ...overrides,
  };
}

const datosBase = {
  citaId: "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
  estudioItemId: "estudio-1",
  nombreArchivo: "radiografia.jpg",
  contenido: new Uint8Array([1, 2, 3]),
};

describe("agregarArchivoEstudio (US8, FR-017 a FR-019)", () => {
  it("resuelve tipo IMAGEN a partir de un Content-Type image/* (FR-018)", async () => {
    const repo = repoFalso();
    await agregarArchivoEstudio(repo, { ...datosBase, tipoMime: "image/jpeg" });
    expect(repo.agregar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "IMAGEN" }));
  });

  it("resuelve tipo PDF a partir de application/pdf (FR-018)", async () => {
    const repo = repoFalso();
    await agregarArchivoEstudio(repo, { ...datosBase, tipoMime: "application/pdf" });
    expect(repo.agregar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "PDF" }));
  });

  it("rechaza un tipo no soportado antes de tocar el repositorio (FR-018)", async () => {
    const repo = repoFalso();
    await expect(
      agregarArchivoEstudio(repo, {
        ...datosBase,
        tipoMime: "application/msword",
      }),
    ).rejects.toThrow(TipoArchivoNoSoportadoError);
    expect(repo.agregar).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que supera el tamaño máximo, sin tocar el repositorio (FR-010)", async () => {
    const repo = repoFalso();
    await expect(
      agregarArchivoEstudio(repo, {
        ...datosBase,
        tipoMime: "image/png",
        contenido: new Uint8Array(TAMANO_MAXIMO_ARCHIVO_BYTES + 1),
      }),
    ).rejects.toThrow(ArchivoDemasiadoGrandeError);
    expect(repo.agregar).not.toHaveBeenCalled();
  });

  it("acepta un archivo exactamente en el límite de tamaño (FR-010, borde)", async () => {
    const repo = repoFalso();
    await agregarArchivoEstudio(repo, {
      ...datosBase,
      tipoMime: "image/png",
      contenido: new Uint8Array(TAMANO_MAXIMO_ARCHIVO_BYTES),
    });
    expect(repo.agregar).toHaveBeenCalled();
  });

  it("funciona aunque la cita esté finalizada — el repositorio decide, no este caso de uso (FR-017)", async () => {
    const repo = repoFalso();
    const resultado = await agregarArchivoEstudio(repo, { ...datosBase, tipoMime: "image/png" });
    expect(resultado.cita.estado).toBe("FINALIZADA");
  });

  it("propaga EstudioNoEncontradoError si el repositorio lo lanza", async () => {
    const repo = repoFalso({
      agregar: vi.fn(async () => {
        throw new EstudioNoEncontradoError();
      }),
    });
    await expect(
      agregarArchivoEstudio(repo, { ...datosBase, tipoMime: "image/png" }),
    ).rejects.toThrow(EstudioNoEncontradoError);
  });
});
