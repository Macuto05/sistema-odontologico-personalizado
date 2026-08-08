/**
 * Test de integración de POST /api/sync para operaciones CITA/EDITAR
 * (contracts/citas-api.md) — conflicto de versión (research.md #7) y rechazo
 * CITA_FINALIZADA (research.md #10).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const citaDb = new Map<string, any>();
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
      update: vi.fn(async ({ where, data }: any) => {
        const actual = citaDb.get(where.id);
        // `data.version` es la directiva Prisma `{ increment: 1 }`, no un número — se
        // descarta acá y se calcula el valor real explícito más abajo.
        const resto = { ...data };
        delete resto.version;
        const actualizado = {
          ...actual,
          ...resto,
          version: actual.version + 1,
          updatedAt: new Date(),
        };
        citaDb.set(where.id, actualizado);
        return conArchivos(actualizado);
      }),
    },
    paciente: {
      findUnique: vi.fn(async () => null),
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

const CITA_ID = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_1 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const OP_2 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a02";

function citaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CITA_ID,
    pacienteId: "d3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01",
    estado: "EN_CURSO",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function operacionEditar(id: string, entidadId: string, payload: unknown, baseVersion: number) {
  return { id, entidad: "CITA", entidadId, tipo: "EDITAR", payload, baseVersion };
}

describe("POST /api/sync — operaciones CITA/EDITAR", () => {
  beforeEach(() => {
    citaDb.clear();
    operacionesSincronizadas.clear();
  });

  it("SINCRONIZADO — aplica el diagnóstico cuando baseVersion coincide (FR-005, FR-006)", async () => {
    citaDb.set(CITA_ID, citaFixture());
    const respuesta = await postSync(
      requestSync([
        operacionEditar(
          OP_1,
          CITA_ID,
          { motivoConsulta: "Dolor", diagnostico: "Caries", categoria: "URGENCIA" },
          1,
        ),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].cita.diagnostico).toBe("Caries");
    expect(cuerpo.resultados[0].cita.version).toBe(2);
  });

  it("CONFLICTO — aplica igual la edición pero la marca cuando baseVersion no coincide (Principio III)", async () => {
    citaDb.set(CITA_ID, citaFixture({ version: 3 }));
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_1, CITA_ID, { diagnostico: "Versión vieja" }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("CONFLICTO");
    expect(cuerpo.resultados[0].cita.diagnostico).toBe("Versión vieja");
  });

  it("RECHAZADO CITA_FINALIZADA — no edita una cita ya finalizada (research.md #10)", async () => {
    citaDb.set(CITA_ID, citaFixture({ estado: "FINALIZADA" }));
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, CITA_ID, { diagnostico: "No debería aplicarse" }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("CITA_FINALIZADA");
  });
});
