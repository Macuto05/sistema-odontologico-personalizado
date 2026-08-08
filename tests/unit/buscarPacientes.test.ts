import { describe, expect, it, vi } from "vitest";
import { buscarPacientes } from "@/application/use-cases/buscarPacientes";
import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { Paciente } from "@/domain/entities/Paciente";

function paciente(overrides: Partial<Paciente>): Paciente {
  return {
    id: "id-1",
    nombreCompleto: "Juana Pérez",
    documentoIdentidad: "111",
    fechaNacimiento: "1990-01-01",
    telefono: null,
    email: null,
    direccion: null,
    genero: null,
    estadoCivil: null,
    ocupacion: null,
    antecedentesPatologicos: [],
    antecedentesPatologicosOtros: [],
    antecedentesHeredofamiliares: [],
    medicamentosActuales: [],
    alergias: [],
    estado: "ACTIVO",
    version: 1,
    conflictoPendiente: null,
    consultorioId: null,
    representanteNombre: null,
    representanteCedula: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function repoFalso(pacientes: Paciente[]): IPacienteRepository {
  return {
    crear: vi.fn(),
    buscar: vi.fn(async () => ({ pacientes, total: pacientes.length })),
    obtenerPorId: vi.fn(),
    obtenerPorDocumento: vi.fn(),
    editar: vi.fn(),
    archivar: vi.fn(),
    reactivar: vi.fn(),
  };
}

const paginacionDefault = { pagina: 1, limite: 10 };

describe("buscarPacientes", () => {
  it("delega la búsqueda por nombre parcial al repositorio (FR-005)", async () => {
    const repo = repoFalso([paciente({ nombreCompleto: "Juana Pérez" })]);
    const resultado = await buscarPacientes(repo, { q: "juana" });
    expect(repo.buscar).toHaveBeenCalledWith({ q: "juana", estado: undefined, ...paginacionDefault });
    expect(resultado.pacientes).toHaveLength(1);
    expect(resultado.total).toBe(1);
  });

  it("delega la búsqueda exacta por documento (FR-005)", async () => {
    const repo = repoFalso([paciente({ documentoIdentidad: "12345678" })]);
    const resultado = await buscarPacientes(repo, { q: "12345678" });
    expect(resultado.pacientes[0]?.documentoIdentidad).toBe("12345678");
  });

  it("por defecto no envía estado explícito, pero sí la paginación por defecto (FR-006, research.md #11)", async () => {
    const repo = repoFalso([]);
    await buscarPacientes(repo, {});
    expect(repo.buscar).toHaveBeenCalledWith({ q: undefined, estado: undefined, ...paginacionDefault });
  });

  it("permite pedir explícitamente los archivados o todos", async () => {
    const repo = repoFalso([paciente({ estado: "ARCHIVADO" })]);
    await buscarPacientes(repo, { estado: "ARCHIVADO" });
    expect(repo.buscar).toHaveBeenCalledWith({ q: undefined, estado: "ARCHIVADO", ...paginacionDefault });
  });

  it("rechaza un valor de estado inválido", async () => {
    const repo = repoFalso([]);
    await expect(buscarPacientes(repo, { estado: "INEXISTENTE" })).rejects.toThrow();
  });

  it("acepta pagina/limite explícitos (research.md #11)", async () => {
    const repo = repoFalso([]);
    await buscarPacientes(repo, { pagina: 3, limite: 25 });
    expect(repo.buscar).toHaveBeenCalledWith({ q: undefined, estado: undefined, pagina: 3, limite: 25 });
  });
});
