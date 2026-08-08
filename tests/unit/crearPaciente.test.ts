import { describe, expect, it, vi } from "vitest";
import { crearPaciente } from "@/application/use-cases/crearPaciente";
import { IPacienteRepository } from "@/domain/repositories/IPacienteRepository";
import { crearPacienteDesdeDatos } from "@/domain/entities/Paciente";
import { DocumentoDuplicadoError } from "@/domain/errors";
import { ZodError } from "zod";

function repoFalso(overrides: Partial<IPacienteRepository> = {}): IPacienteRepository {
  return {
    crear: vi.fn(async (datos) => crearPacienteDesdeDatos(datos)),
    buscar: vi.fn(async () => ({ pacientes: [], total: 0 })),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorDocumento: vi.fn(async () => null),
    editar: vi.fn(),
    archivar: vi.fn(),
    reactivar: vi.fn(),
    ...overrides,
  };
}

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombreCompleto: "Juana Pérez",
  documentoIdentidad: "12345678",
  fechaNacimiento: "1990-01-01",
};

describe("crearPaciente", () => {
  it("crea un paciente con datos válidos (FR-001)", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, datosValidos);
    expect(paciente.estado).toBe("ACTIVO");
    expect(paciente.documentoIdentidad).toBe("12345678");
    expect(repo.crear).toHaveBeenCalledTimes(1);
  });

  it("rechaza si falta el nombre completo (FR-002)", async () => {
    const repo = repoFalso();
    await expect(crearPaciente(repo, { ...datosValidos, nombreCompleto: "" })).rejects.toThrow(
      ZodError,
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("rechaza si falta el documento de identidad (FR-002)", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, documentoIdentidad: "" }),
    ).rejects.toThrow(ZodError);
  });

  it("rechaza si falta la fecha de nacimiento (FR-002)", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, fechaNacimiento: "" }),
    ).rejects.toThrow(ZodError);
  });

  it("propaga DocumentoDuplicadoError si el repositorio lo detecta (FR-003, FR-004)", async () => {
    const existente = crearPacienteDesdeDatos({ ...datosValidos, id: "otro-id" });
    const repo = repoFalso({
      crear: vi.fn(async () => {
        throw new DocumentoDuplicadoError(existente);
      }),
    });
    await expect(crearPaciente(repo, datosValidos)).rejects.toThrow(DocumentoDuplicadoError);
  });

  it("acepta teléfono, email, dirección y género opcionales ausentes", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, datosValidos);
    expect(paciente.telefono).toBeNull();
    expect(paciente.email).toBeNull();
    expect(paciente.direccion).toBeNull();
    expect(paciente.genero).toBeNull();
  });

  it("acepta y persiste un género válido", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, { ...datosValidos, genero: "FEMENINO" });
    expect(paciente.genero).toBe("FEMENINO");
  });

  it("rechaza un género fuera del enum permitido", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, genero: "INVALIDO" }),
    ).rejects.toThrow(ZodError);
  });

  it("acepta y persiste estado civil y ocupación válidos", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, {
      ...datosValidos,
      estadoCivil: "CASADO",
      ocupacion: "Ingeniero de software",
    });
    expect(paciente.estadoCivil).toBe("CASADO");
    expect(paciente.ocupacion).toBe("Ingeniero de software");
  });

  it("rechaza un estado civil fuera del enum permitido", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, estadoCivil: "INVALIDO" }),
    ).rejects.toThrow(ZodError);
  });

  it("acepta y persiste un consultorioId válido (004-consultorios, FR-006)", async () => {
    const repo = repoFalso();
    const consultorioId = "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c";
    const paciente = await crearPaciente(repo, { ...datosValidos, consultorioId });
    expect(paciente.consultorioId).toBe(consultorioId);
  });

  it("acepta ausencia de consultorioId, queda null (FR-009)", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, datosValidos);
    expect(paciente.consultorioId).toBeNull();
  });

  it("rechaza un consultorioId con formato inválido (no uuid)", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, consultorioId: "no-es-un-uuid" }),
    ).rejects.toThrow(ZodError);
  });

  it("acepta un paciente sin documento propio si tiene representante (007-representante-menor, FR-001)", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, {
      ...datosValidos,
      documentoIdentidad: null,
      representanteNombre: "María Pérez",
      representanteCedula: "V-12345678",
    });
    expect(paciente.documentoIdentidad).toBeNull();
    expect(paciente.representanteNombre).toBe("María Pérez");
    expect(paciente.representanteCedula).toBe("V-12345678");
  });

  it("rechaza un paciente sin documento propio y sin representante (007-representante-menor, FR-001)", async () => {
    const repo = repoFalso();
    await expect(
      crearPaciente(repo, { ...datosValidos, documentoIdentidad: null }),
    ).rejects.toThrow(ZodError);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("acepta que la cédula del representante coincida con el documento de otro paciente (texto libre, no se valida)", async () => {
    const repo = repoFalso();
    const paciente = await crearPaciente(repo, {
      ...datosValidos,
      representanteNombre: "María Pérez",
      representanteCedula: datosValidos.documentoIdentidad,
    });
    expect(paciente.representanteCedula).toBe(datosValidos.documentoIdentidad);
  });
});
