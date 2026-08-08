/**
 * Test de integración de PUT /api/patients/:id (contracts/patients-api.md).
 * Mock del cliente de Prisma — ver nota en patients-create.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";
let pacientes: Map<string, any>;

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    paciente: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return pacientes.get(where.id) ?? null;
        if (where.documentoIdentidad) {
          return [...pacientes.values()].find((p) => p.documentoIdentidad === where.documentoIdentidad) ?? null;
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const actual = pacientes.get(where.id);
        const version = data.version?.increment ? actual.version + data.version.increment : actual.version;
        const actualizado = { ...actual, ...data, version, conflictoPendiente: data.conflictoPendiente ?? null };
        pacientes.set(where.id, actualizado);
        return actualizado;
      }),
    },
  },
}));

const { PUT } = await import("@/app/api/patients/[id]/route");

function reqEditar(body: unknown) {
  return new Request(`http://localhost/api/patients/${ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const datosBase = {
  nombreCompleto: "Juana Pérez",
  documentoIdentidad: "12345678",
  fechaNacimiento: new Date("1990-01-01"),
  telefono: null,
  email: null,
  direccion: null,
  estado: "ACTIVO" as const,
  version: 1,
  conflictoPendiente: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PUT /api/patients/:id", () => {
  beforeEach(() => {
    pacientes = new Map([[ID, { id: ID, ...datosBase }]]);
  });

  it("200 — edita con datos válidos y baseVersion correcta", async () => {
    const respuesta = await PUT(
      reqEditar({ nombreCompleto: "Juana P. Editada", documentoIdentidad: "12345678", fechaNacimiento: "1990-01-01", baseVersion: 1 }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.nombreCompleto).toBe("Juana P. Editada");
  });

  it("409 PACIENTE_ARCHIVADO — no permite editar un paciente archivado (FR-008)", async () => {
    pacientes.set(ID, { ...pacientes.get(ID), estado: "ARCHIVADO" });
    const respuesta = await PUT(
      reqEditar({ ...datosBase, baseVersion: 1 }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe("PACIENTE_ARCHIVADO");
  });

  it("409 DOCUMENTO_DUPLICADO — no permite cambiar a un documento ya usado", async () => {
    pacientes.set("otro", { ...datosBase, id: "otro", documentoIdentidad: "999" });
    const respuesta = await PUT(
      reqEditar({ ...datosBase, documentoIdentidad: "999", baseVersion: 1 }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe("DOCUMENTO_DUPLICADO");
  });

  it("409 CONFLICTO_VERSION — aplica el cambio igual y lo marca para revisión (Principio III)", async () => {
    // Simula que otro dispositivo ya sincronizó una edición (version pasó de 1 a 2) antes
    // que esta, que todavía cree que la base es la version 1.
    pacientes.set(ID, { ...pacientes.get(ID), version: 2 });
    const respuesta = await PUT(
      reqEditar({ ...datosBase, nombreCompleto: "Cambiado en otro dispositivo", baseVersion: 1 }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toBe("CONFLICTO_VERSION");
    expect(cuerpo.paciente.conflictoPendiente).not.toBeNull();
    // La edición se aplicó igual, no se perdió:
    expect(cuerpo.paciente.nombreCompleto).toBe("Cambiado en otro dispositivo");
  });

  it("200 — reemplaza por completo la historia clínica (003-historia-clinica-paciente, FR-010)", async () => {
    pacientes.set(ID, {
      ...pacientes.get(ID),
      antecedentesPatologicos: ["DIABETES"],
      antecedentesPatologicosOtros: [],
      antecedentesHeredofamiliares: ["Valor anterior"],
      medicamentosActuales: [],
      alergias: [],
    });
    const respuesta = await PUT(
      reqEditar({
        ...datosBase,
        baseVersion: 1,
        antecedentesPatologicos: ["ARTRITIS", "OSTEOPOROSIS"],
        antecedentesHeredofamiliares: ["Nuevo valor"],
        alergias: ["Penicilina"],
      }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    // DIABETES ya no está — reemplazo completo, no merge con lo anterior.
    expect(cuerpo.antecedentesPatologicos).toEqual(["ARTRITIS", "OSTEOPOROSIS"]);
    expect(cuerpo.antecedentesHeredofamiliares).toEqual(["Nuevo valor"]);
    expect(cuerpo.alergias).toEqual(["Penicilina"]);
  });

  it("409 PACIENTE_ARCHIVADO — bloquea también cambios de historia clínica (FR-013)", async () => {
    pacientes.set(ID, { ...pacientes.get(ID), estado: "ARCHIVADO" });
    const respuesta = await PUT(
      reqEditar({ ...datosBase, baseVersion: 1, antecedentesPatologicos: ["DIABETES"] }),
      { params: Promise.resolve({ id: ID }) } as any,
    );
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe("PACIENTE_ARCHIVADO");
  });
});
