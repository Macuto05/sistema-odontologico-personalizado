/**
 * Test de integración de POST /api/sync para operaciones CITA/FINALIZAR
 * (contracts/citas-api.md) — idempotencia y rechazo de una EDITAR posterior sobre una
 * cita ya finalizada (research.md #10).
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
        const actualizado = { ...actual, ...resto, version: actual.version + 1, updatedAt: new Date() };
        citaDb.set(where.id, actualizado);
        return conArchivos(actualizado);
      }),
    },
    paciente: { findUnique: vi.fn(async () => null) },
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
const OP_3 = "e1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a03";

function citaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CITA_ID,
    pacienteId: "d3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01",
    estado: "EN_CURSO",
    categoria: null,
    motivoConsulta: "Dolor",
    diagnostico: "Caries",
    recetaItems: [],
    estudioItems: [{ id: "6a1df9ea-9216-44d1-a38b-e528ccc302a4", nombre: "Radiografía" }],
    version: 1,
    conflictoPendiente: null,
    finalizadaEn: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function operacionFinalizar(id: string, entidadId: string, baseVersion: number) {
  return { id, entidad: "CITA", entidadId, tipo: "FINALIZAR", payload: {}, baseVersion };
}

function operacionEditar(id: string, entidadId: string, payload: unknown, baseVersion: number) {
  return { id, entidad: "CITA", entidadId, tipo: "EDITAR", payload, baseVersion };
}

describe("POST /api/sync — operaciones CITA/FINALIZAR", () => {
  beforeEach(() => {
    citaDb.clear();
    operacionesSincronizadas.clear();
  });

  it("SINCRONIZADO — marca la cita como finalizada (FR-014)", async () => {
    citaDb.set(CITA_ID, citaFixture());
    const respuesta = await postSync(requestSync([operacionFinalizar(OP_1, CITA_ID, 1)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].cita.estado).toBe("FINALIZADA");
    expect(cuerpo.resultados[0].cita.finalizadaEn).not.toBeNull();
  });

  it("es idempotente: finalizar una cita ya finalizada no falla ni la vuelve a versionar de más", async () => {
    citaDb.set(CITA_ID, citaFixture({ estado: "FINALIZADA", finalizadaEn: new Date(), version: 2 }));
    const respuesta = await postSync(requestSync([operacionFinalizar(OP_1, CITA_ID, 2)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].cita.version).toBe(2);
  });

  it("RECHAZADO CITA_FINALIZADA — una EDITAR posterior sobre la cita ya finalizada se rechaza (research.md #10)", async () => {
    citaDb.set(CITA_ID, citaFixture());
    await postSync(requestSync([operacionFinalizar(OP_1, CITA_ID, 1)]));
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, CITA_ID, { diagnostico: "Cambio tardío" }, 2)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("CITA_FINALIZADA");
  });

  it("CONFLICTO — finaliza igual pero lo marca cuando baseVersion no coincide (Principio III)", async () => {
    citaDb.set(CITA_ID, citaFixture({ version: 5 }));
    const respuesta = await postSync(requestSync([operacionFinalizar(OP_3, CITA_ID, 1)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("CONFLICTO");
    expect(cuerpo.resultados[0].cita.estado).toBe("FINALIZADA");
  });
});
