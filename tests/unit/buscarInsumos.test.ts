import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { buscarInsumos } from "@/application/use-cases/buscarInsumos";
import {
  IInsumoRepository,
  OpcionesBusquedaInsumos,
} from "@/domain/repositories/IInsumoRepository";

function repoEspia(): {
  repo: IInsumoRepository;
  ultimasOpciones: () => OpcionesBusquedaInsumos | undefined;
} {
  let capturadas: OpcionesBusquedaInsumos | undefined;
  const repo: IInsumoRepository = {
    crear: vi.fn(),
    buscar: vi.fn(async (opciones: OpcionesBusquedaInsumos) => {
      capturadas = opciones;
      return { insumos: [], total: 0 };
    }),
    obtenerPorId: vi.fn(async () => null),
    listarCategorias: vi.fn(async () => []),
    contarAReponer: vi.fn(async () => 0),
    editar: vi.fn(),
    archivar: vi.fn(),
    reactivar: vi.fn(),
  };
  return { repo, ultimasOpciones: () => capturadas };
}

describe("buscarInsumos", () => {
  it("aplica los defaults de paginación: página 1, 10 por página (FR-007)", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, {});
    expect(ultimasOpciones()).toMatchObject({ pagina: 1, limite: 10 });
  });

  it("pasa el texto de búsqueda por nombre al repositorio (FR-008)", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { q: "guantes" });
    expect(ultimasOpciones()?.q).toBe("guantes");
  });

  it("pasa el filtro por categoría al repositorio (FR-009)", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { categoria: "Desechables" });
    expect(ultimasOpciones()?.categoria).toBe("Desechables");
  });

  it("interpreta aReponer=true de la query string como booleano (FR-006)", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { aReponer: "true" });
    expect(ultimasOpciones()?.aReponer).toBe(true);
  });

  it("interpreta aReponer=false de la query string como booleano", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { aReponer: "false" });
    expect(ultimasOpciones()?.aReponer).toBe(false);
  });

  it("acepta el filtro por estado ARCHIVADO (FR-010)", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { estado: "ARCHIVADO" });
    expect(ultimasOpciones()?.estado).toBe("ARCHIVADO");
  });

  it("rechaza un estado inválido", async () => {
    const { repo } = repoEspia();
    await expect(buscarInsumos(repo, { estado: "BORRADO" })).rejects.toThrow(ZodError);
  });

  it("rechaza una página menor a 1", async () => {
    const { repo } = repoEspia();
    await expect(buscarInsumos(repo, { pagina: 0 })).rejects.toThrow(ZodError);
  });

  it("coacciona pagina/limite que llegan como string desde la query", async () => {
    const { repo, ultimasOpciones } = repoEspia();
    await buscarInsumos(repo, { pagina: "3", limite: "10" });
    expect(ultimasOpciones()).toMatchObject({ pagina: 3, limite: 10 });
  });
});
