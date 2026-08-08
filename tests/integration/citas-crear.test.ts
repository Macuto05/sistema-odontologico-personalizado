/**
 * Test de integración de POST /api/sync para operaciones CITA/CREAR
 * (contracts/citas-api.md) — idempotencia por `id` de operación, reconciliación de "una
 * cita en curso a la vez" del lado servidor (research.md #6), y rechazo cuando el
 * paciente está archivado.
 *
 * Usa un mock del cliente de Prisma, igual que tests/integration/consultorios.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const citaDb = new Map<string, any>();
const pacienteDb = new Map<string, any>();
const operacionesSincronizadas = new Map<string, any>();

function conArchivos(cita: any) {
  return { ...cita, archivos: [] };
}

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    cita: {
      findUnique: vi.fn(async ({ where }: any) => {
        const c = citaDb.get(where.id);
        return c ? conArchivos(c) : null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        const c = [...citaDb.values()].find(
          (x) => x.pacienteId === where.pacienteId && x.estado === where.estado,
        );
        return c ? conArchivos(c) : null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const registro = { ...data, createdAt: new Date(), updatedAt: new Date() };
        citaDb.set(data.id, registro);
        return conArchivos(registro);
      }),
    },
    paciente: {
      findUnique: vi.fn(async ({ where }: any) => pacienteDb.get(where.id) ?? null),
    },
    operacionSincronizada: {
      findUnique: vi.fn(async ({ where }: any) => operacionesSincronizadas.get(where.id) ?? null),
      create: vi.fn(async ({ data }: any) => {
        operacionesSincronizadas.set(data.id, data);
        return data;
      }),
    },
  },
}));

const { POST: postSync } = await import("@/app/api/sync/route");

function requestSync(operaciones: unknown[]) {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operaciones }),
  }) as any;
}

function operacionCrear(id: string, entidadId: string, pacienteId: string) {
  return { id, entidad: "CITA", entidadId, tipo: "CREAR", payload: { id: entidadId, pacienteId } };
}

const PACIENTE_ID = "d3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_1 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_2 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a02";
const OP_3 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a03";
const OP_4 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a04";
const CITA_A = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const CITA_B = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a02";
const CITA_C = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a03";
const CITA_D = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a04";

function pacienteFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PACIENTE_ID,
    nombreCompleto: "Juana Pérez",
    documentoIdentidad: "12345678",
    fechaNacimiento: new Date("1990-01-01"),
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/sync — operaciones CITA/CREAR", () => {
  beforeEach(() => {
    citaDb.clear();
    pacienteDb.clear();
    operacionesSincronizadas.clear();
  });

  it("SINCRONIZADO — crea la cita para un paciente activo (FR-002)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    const respuesta = await postSync(requestSync([operacionCrear(OP_1, CITA_A, PACIENTE_ID)]));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].cita.estado).toBe("EN_CURSO");
  });

  it("reconciliación: un segundo CREAR con id distinto para el mismo paciente devuelve la cita ya en curso, sin duplicar (research.md #6)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    await postSync(requestSync([operacionCrear(OP_1, CITA_A, PACIENTE_ID)]));
    const respuesta = await postSync(requestSync([operacionCrear(OP_2, CITA_B, PACIENTE_ID)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].cita.id).toBe(CITA_A);
    expect(citaDb.size).toBe(1);
  });

  it("RECHAZADO PACIENTE_ARCHIVADO — no crea la cita si el paciente está archivado (FR-001)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture({ estado: "ARCHIVADO" }));
    const respuesta = await postSync(requestSync([operacionCrear(OP_3, CITA_C, PACIENTE_ID)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("PACIENTE_ARCHIVADO");
    expect(citaDb.size).toBe(0);
  });

  it("es idempotente por id de operación: reintentar la misma operación no crea una segunda cita", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    const op = operacionCrear(OP_4, CITA_D, PACIENTE_ID);
    await postSync(requestSync([op]));
    const segunda = await postSync(requestSync([op]));
    const cuerpo = await segunda.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(citaDb.size).toBe(1);
  });
});
