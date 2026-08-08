import { describe, expect, it, vi } from "vitest";
import { archivarPaciente } from "@/application/use-cases/archivarPaciente";
import { reactivarPaciente } from "@/application/use-cases/reactivarPaciente";
import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { crearPacienteDesdeDatos } from "@/domain/entities/Paciente";
import { PacienteNoEstaArchivadoError } from "@/domain/errors";

const paciente = crearPacienteDesdeDatos({
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombreCompleto: "Juana Pérez",
  documentoIdentidad: "12345678",
  fechaNacimiento: "1990-01-01",
});

function repoFalso(overrides: Partial<IPacienteRepository> = {}): IPacienteRepository {
  return {
    crear: vi.fn(),
    buscar: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerPorDocumento: vi.fn(),
    editar: vi.fn(),
    archivar: vi.fn(async () => ({
      paciente: { ...paciente, estado: "ARCHIVADO" as const },
      yaEstabaArchivado: false,
    })),
    reactivar: vi.fn(async () => ({ ...paciente, estado: "ACTIVO" as const })),
    ...overrides,
  };
}

describe("archivarPaciente", () => {
  it("archiva un paciente activo sin eliminar sus datos (FR-009)", async () => {
    const repo = repoFalso();
    const { paciente: resultado, yaEstabaArchivado } = await archivarPaciente(repo, paciente.id);
    expect(resultado.estado).toBe("ARCHIVADO");
    expect(resultado.nombreCompleto).toBe(paciente.nombreCompleto);
    expect(yaEstabaArchivado).toBe(false);
  });

  it("es idempotente: archivar uno ya archivado no da error (Edge Case)", async () => {
    const repo = repoFalso({
      archivar: vi.fn(async () => ({
        paciente: { ...paciente, estado: "ARCHIVADO" as const },
        yaEstabaArchivado: true,
      })),
    });
    const { yaEstabaArchivado } = await archivarPaciente(repo, paciente.id);
    expect(yaEstabaArchivado).toBe(true);
  });
});

describe("reactivarPaciente", () => {
  it("reactiva un paciente archivado con todos sus datos intactos (FR-010)", async () => {
    const repo = repoFalso();
    const resultado = await reactivarPaciente(repo, paciente.id);
    expect(resultado.estado).toBe("ACTIVO");
    expect(resultado.documentoIdentidad).toBe(paciente.documentoIdentidad);
  });

  it("propaga error si se intenta reactivar uno que ya está activo", async () => {
    const repo = repoFalso({
      reactivar: vi.fn(async () => {
        throw new PacienteNoEstaArchivadoError();
      }),
    });
    await expect(reactivarPaciente(repo, paciente.id)).rejects.toThrow(
      PacienteNoEstaArchivadoError,
    );
  });
});
