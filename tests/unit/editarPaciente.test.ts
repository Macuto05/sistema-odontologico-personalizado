import { describe, expect, it, vi } from "vitest";
import { editarPaciente } from "@/application/use-cases/editarPaciente";
import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { crearPacienteDesdeDatos } from "@/domain/entities/Paciente";
import { DocumentoDuplicadoError, PacienteArchivadoError } from "@/domain/errors";
import { ZodError } from "zod";

const base = crearPacienteDesdeDatos({
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
    editar: vi.fn(async (id, datos) => ({
      paciente: { ...base, ...datos, id, version: base.version + 1 },
      conflicto: false,
    })),
    archivar: vi.fn(),
    reactivar: vi.fn(),
    ...overrides,
  };
}

const edicionValida = {
  nombreCompleto: "Juana Pérez Actualizada",
  documentoIdentidad: "12345678",
  fechaNacimiento: "1990-01-01",
  baseVersion: 1,
};

// Zod aplica el default [] de los 5 campos de historia clínica aunque no se envíen
// (pacienteDto.ts) — lo que llega al repositorio siempre los incluye.
const edicionValidaParseada = {
  ...edicionValida,
  antecedentesPatologicos: [],
  antecedentesPatologicosOtros: [],
  antecedentesHeredofamiliares: [],
  medicamentosActuales: [],
  alergias: [],
};

describe("editarPaciente", () => {
  it("edita un paciente activo con datos válidos", async () => {
    const repo = repoFalso();
    const { paciente } = await editarPaciente(repo, base.id, edicionValida);
    expect(paciente.nombreCompleto).toBe("Juana Pérez Actualizada");
    expect(repo.editar).toHaveBeenCalledWith(base.id, edicionValidaParseada);
  });

  it("reenvía el género al repositorio cuando se edita", async () => {
    const repo = repoFalso();
    await editarPaciente(repo, base.id, { ...edicionValida, genero: "OTRO" });
    expect(repo.editar).toHaveBeenCalledWith(base.id, { ...edicionValidaParseada, genero: "OTRO" });
  });

  it("rechaza datos con campos obligatorios vacíos", async () => {
    const repo = repoFalso();
    await expect(
      editarPaciente(repo, base.id, { ...edicionValida, nombreCompleto: "" }),
    ).rejects.toThrow(ZodError);
  });

  it("propaga DocumentoDuplicadoError si el nuevo documento ya existe (FR-007)", async () => {
    const otro = crearPacienteDesdeDatos({ ...base, id: "otro", documentoIdentidad: "999" });
    const repo = repoFalso({
      editar: vi.fn(async () => {
        throw new DocumentoDuplicadoError(otro);
      }),
    });
    await expect(editarPaciente(repo, base.id, edicionValida)).rejects.toThrow(
      DocumentoDuplicadoError,
    );
  });

  it("propaga PacienteArchivadoError si el paciente está archivado (FR-008)", async () => {
    const repo = repoFalso({
      editar: vi.fn(async () => {
        throw new PacienteArchivadoError();
      }),
    });
    await expect(editarPaciente(repo, base.id, edicionValida)).rejects.toThrow(
      PacienteArchivadoError,
    );
  });

  it("propaga conflicto=true cuando el repositorio detecta baseVersion desactualizada", async () => {
    const repo = repoFalso({
      editar: vi.fn(async (id, datos) => ({
        paciente: { ...base, ...datos, id, conflictoPendiente: { versionServidor: {}, versionDispositivo: {}, detectadoEn: "now" } },
        conflicto: true,
      })),
    });
    const resultado = await editarPaciente(repo, base.id, { ...edicionValida, baseVersion: 1 });
    expect(resultado.conflicto).toBe(true);
    expect(resultado.paciente.conflictoPendiente).not.toBeNull();
  });

  it("reenvía historia clínica al repositorio como reemplazo completo (003-historia-clinica-paciente, FR-010)", async () => {
    const repo = repoFalso();
    await editarPaciente(repo, base.id, {
      ...edicionValida,
      antecedentesPatologicos: ["ARTRITIS", "OSTEOPOROSIS"],
      antecedentesHeredofamiliares: ["Nuevo valor"],
      alergias: ["Penicilina"],
    });
    expect(repo.editar).toHaveBeenCalledWith(base.id, {
      ...edicionValidaParseada,
      antecedentesPatologicos: ["ARTRITIS", "OSTEOPOROSIS"],
      antecedentesHeredofamiliares: ["Nuevo valor"],
      alergias: ["Penicilina"],
    });
  });

  it("rechaza un antecedente patológico fuera del catálogo fijo (FR-002)", async () => {
    const repo = repoFalso();
    await expect(
      editarPaciente(repo, base.id, { ...edicionValida, antecedentesPatologicos: ["INVALIDO"] }),
    ).rejects.toThrow(ZodError);
  });

  it("reenvía el consultorioId al repositorio cuando se edita (004-consultorios, FR-007)", async () => {
    const repo = repoFalso();
    const consultorioId = "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c";
    await editarPaciente(repo, base.id, { ...edicionValida, consultorioId });
    expect(repo.editar).toHaveBeenCalledWith(base.id, {
      ...edicionValidaParseada,
      consultorioId,
    });
  });

  it("reenvía consultorioId null para quitar el consultorio asignado", async () => {
    const repo = repoFalso();
    await editarPaciente(repo, base.id, { ...edicionValida, consultorioId: null });
    expect(repo.editar).toHaveBeenCalledWith(base.id, {
      ...edicionValidaParseada,
      consultorioId: null,
    });
  });

  it("rechaza un consultorioId con formato inválido (no uuid)", async () => {
    const repo = repoFalso();
    await expect(
      editarPaciente(repo, base.id, { ...edicionValida, consultorioId: "no-es-un-uuid" }),
    ).rejects.toThrow(ZodError);
  });

  it("acepta editar a un paciente sin documento propio si se le agrega representante (007-representante-menor, FR-001)", async () => {
    const repo = repoFalso();
    await editarPaciente(repo, base.id, {
      ...edicionValida,
      documentoIdentidad: null,
      representanteNombre: "María Pérez",
      representanteCedula: "V-12345678",
    });
    expect(repo.editar).toHaveBeenCalledWith(base.id, {
      ...edicionValidaParseada,
      documentoIdentidad: null,
      representanteNombre: "María Pérez",
      representanteCedula: "V-12345678",
    });
  });

  it("rechaza editar a un paciente sin documento propio y sin representante (007-representante-menor, FR-001)", async () => {
    const repo = repoFalso();
    await expect(
      editarPaciente(repo, base.id, { ...edicionValida, documentoIdentidad: null }),
    ).rejects.toThrow(ZodError);
    expect(repo.editar).not.toHaveBeenCalled();
  });
});
