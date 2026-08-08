/**
 * Test de integración de POST /api/patients/:id/archive y /reactivate.
 * Mock del cliente de Prisma — ver nota en patients-create.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";
let pacientes: Map<string, any>;

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    paciente: {
      findUnique: vi.fn(async ({ where }: any) => pacientes.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => {
        const actualizado = { ...pacientes.get(where.id), ...data };
        pacientes.set(where.id, actualizado);
        return actualizado;
      }),
    },
  },
}));

const { POST: archivar } = await import("@/app/api/patients/[id]/archive/route");
const { POST: reactivar } = await import("@/app/api/patients/[id]/reactivate/route");

const contexto = { params: Promise.resolve({ id: ID }) } as any;

const base = {
  id: ID,
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

describe("POST /api/patients/:id/archive", () => {
  beforeEach(() => {
    pacientes = new Map([[ID, { ...base }]]);
  });

  it("200 — archiva un paciente activo (FR-009)", async () => {
    const respuesta = await archivar(new Request(`http://localhost`) as any, contexto);
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.paciente.estado).toBe("ARCHIVADO");
    expect(cuerpo.yaEstabaArchivado).toBe(false);
  });

  it("200 — archivar uno ya archivado no da error (Edge Case)", async () => {
    pacientes.set(ID, { ...base, estado: "ARCHIVADO" });
    const respuesta = await archivar(new Request(`http://localhost`) as any, contexto);
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.yaEstabaArchivado).toBe(true);
  });
});

describe("POST /api/patients/:id/reactivate", () => {
  beforeEach(() => {
    pacientes = new Map([[ID, { ...base, estado: "ARCHIVADO" }]]);
  });

  it("200 — reactiva un paciente archivado (FR-010)", async () => {
    const respuesta = await reactivar(new Request(`http://localhost`) as any, contexto);
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.paciente.estado).toBe("ACTIVO");
  });

  it("409 — ya estaba activo, nada que reactivar", async () => {
    pacientes.set(ID, { ...base, estado: "ACTIVO" });
    const respuesta = await reactivar(new Request(`http://localhost`) as any, contexto);
    expect(respuesta.status).toBe(409);
  });
});
