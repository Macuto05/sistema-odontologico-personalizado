/**
 * Test de integración de POST /api/sync para operaciones ITEM_PLAN_TRATAMIENTO
 * (contracts/odontograma-api.md, US5).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const itemDb = new Map<string, any>();
const pacienteDb = new Map<string, any>();
const operacionesSincronizadas = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    itemPlanTratamiento: {
      findUnique: vi.fn(async ({ where }: any) => itemDb.get(where.id) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const creado = { ...data, conflictoPendiente: null, createdAt: new Date(), updatedAt: new Date() };
        itemDb.set(creado.id, creado);
        return creado;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const actual = itemDb.get(where.id);
        const resto = { ...data };
        delete resto.version;
        const actualizado = { ...actual, ...resto, version: actual.version + 1, updatedAt: new Date() };
        itemDb.set(where.id, actualizado);
        return actualizado;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const actual = itemDb.get(where.id);
        itemDb.delete(where.id);
        return actual;
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

const PACIENTE_ID = "d3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const ITEM_ID = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_1 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_2 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a02";
const OP_3 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a03";

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

function operacionCrear(id: string, entidadId: string, payload: unknown) {
  return { id, entidad: "ITEM_PLAN_TRATAMIENTO", entidadId, tipo: "CREAR", payload };
}
function operacionEditar(id: string, entidadId: string, payload: unknown, baseVersion: number) {
  return {
    id,
    entidad: "ITEM_PLAN_TRATAMIENTO",
    entidadId,
    tipo: "EDITAR",
    payload,
    baseVersion,
  };
}
function operacionEliminar(id: string, entidadId: string) {
  return { id, entidad: "ITEM_PLAN_TRATAMIENTO", entidadId, tipo: "ELIMINAR", payload: {} };
}

describe("POST /api/sync — operaciones ITEM_PLAN_TRATAMIENTO", () => {
  beforeEach(() => {
    itemDb.clear();
    pacienteDb.clear();
    operacionesSincronizadas.clear();
  });

  it("SINCRONIZADO — crea una línea de plan de tratamiento (FR-016)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    const respuesta = await postSync(
      requestSync([
        operacionCrear(OP_1, ITEM_ID, {
          pacienteId: PACIENTE_ID,
          fecha: "2026-01-01",
          diente: "16",
          tratamiento: "Obturación",
        }),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].itemPlanTratamiento.tratamiento).toBe("Obturación");
  });

  it("RECHAZADO PACIENTE_ARCHIVADO — no crea la línea de un paciente archivado (FR-019)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture({ estado: "ARCHIVADO" }));
    const respuesta = await postSync(
      requestSync([
        operacionCrear(OP_1, ITEM_ID, {
          pacienteId: PACIENTE_ID,
          fecha: "2026-01-01",
          tratamiento: "Obturación",
        }),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("PACIENTE_ARCHIVADO");
  });

  it("SINCRONIZADO — edita una línea cuando baseVersion coincide", async () => {
    itemDb.set(ITEM_ID, {
      id: ITEM_ID,
      pacienteId: PACIENTE_ID,
      fecha: new Date("2026-01-01"),
      diente: "16",
      tratamiento: "Obturación",
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, ITEM_ID, { tratamiento: "Obturación revisada" }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].itemPlanTratamiento.tratamiento).toBe("Obturación revisada");
  });

  it("CONFLICTO — aplica igual la edición pero la marca cuando baseVersion no coincide", async () => {
    itemDb.set(ITEM_ID, {
      id: ITEM_ID,
      pacienteId: PACIENTE_ID,
      fecha: new Date("2026-01-01"),
      diente: "16",
      tratamiento: "Obturación",
      version: 3,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, ITEM_ID, { tratamiento: "Versión vieja" }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("CONFLICTO");
  });

  it("SINCRONIZADO — elimina una línea", async () => {
    itemDb.set(ITEM_ID, {
      id: ITEM_ID,
      pacienteId: PACIENTE_ID,
      fecha: new Date("2026-01-01"),
      diente: "16",
      tratamiento: "Obturación",
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await postSync(requestSync([operacionEliminar(OP_3, ITEM_ID)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(itemDb.has(ITEM_ID)).toBe(false);
  });
});
