/**
 * Test de integración de GET /api/consultorios y POST /api/sync para operaciones
 * CONSULTORIO (contracts/consultorios-api.md).
 *
 * Usa un mock del cliente de Prisma (no requiere una base de datos real corriendo),
 * igual que tests/integration/patients-create.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const consultorioDb = new Map<string, any>();
const nombreIndex = new Map<string, string>();
const operacionesSincronizadas = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    consultorio: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return consultorioDb.get(where.id) ?? null;
        if (where.nombreNormalizado) {
          const id = nombreIndex.get(where.nombreNormalizado);
          return id ? consultorioDb.get(id) : null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const registro = { ...data, createdAt: new Date() };
        consultorioDb.set(data.id, registro);
        nombreIndex.set(data.nombreNormalizado, data.id);
        return registro;
      }),
      findMany: vi.fn(async () => [...consultorioDb.values()]),
      delete: vi.fn(async ({ where }: any) => {
        const registro = consultorioDb.get(where.id);
        consultorioDb.delete(where.id);
        return registro;
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

const { GET } = await import("@/app/api/consultorios/route");
const { POST: postSync } = await import("@/app/api/sync/route");

function requestSync(operaciones: unknown[]) {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operaciones }),
  }) as any;
}

function operacionCrear(id: string, entidadId: string, nombre: string) {
  return { id, entidad: "CONSULTORIO", entidadId, tipo: "CREAR", payload: { id: entidadId, nombre } };
}

function operacionEliminar(id: string, entidadId: string) {
  return { id, entidad: "CONSULTORIO", entidadId, tipo: "ELIMINAR", payload: { id: entidadId } };
}

describe("GET /api/consultorios", () => {
  beforeEach(() => {
    consultorioDb.clear();
    nombreIndex.clear();
    operacionesSincronizadas.clear();
  });

  it("200 — devuelve la lista vacía cuando no hay consultorios", async () => {
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.consultorios).toEqual([]);
  });
});

describe("POST /api/sync — operaciones CONSULTORIO", () => {
  beforeEach(() => {
    consultorioDb.clear();
    nombreIndex.clear();
    operacionesSincronizadas.clear();
  });

  it("CREAR — SINCRONIZADO con nombre válido (FR-001)", async () => {
    const entidadId = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";
    const opId = "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c";
    const respuesta = await postSync(
      requestSync([operacionCrear(opId, entidadId, "Sede Norte")]),
    );
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].consultorio.nombre).toBe("Sede Norte");
  });

  it("CREAR — RECHAZADO con NOMBRE_DUPLICADO insensible a mayúsculas (FR-003)", async () => {
    await postSync(
      requestSync([
        operacionCrear(
          "6a1df9ea-9216-44d1-a38b-e528ccc302a1",
          "6a1df9ea-9216-44d1-a38b-e528ccc302a2",
          "Sede Norte",
        ),
      ]),
    );
    const respuesta = await postSync(
      requestSync([
        operacionCrear(
          "6a1df9ea-9216-44d1-a38b-e528ccc302a3",
          "6a1df9ea-9216-44d1-a38b-e528ccc302a4",
          "sede norte",
        ),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("NOMBRE_DUPLICADO");
    expect(cuerpo.resultados[0].consultorioExistente).toBeDefined();
  });

  it("ELIMINAR — idempotente, SINCRONIZADO aunque el id ya no exista (FR-004)", async () => {
    const respuesta = await postSync(
      requestSync([
        operacionEliminar(
          "6a1df9ea-9216-44d1-a38b-e528ccc302a5",
          "6a1df9ea-9216-44d1-a38b-e528ccc302a6",
        ),
      ]),
    );
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
  });

  it("es idempotente por id de operación: reintentar la misma operación no la vuelve a aplicar", async () => {
    const op = operacionCrear(
      "6a1df9ea-9216-44d1-a38b-e528ccc302a7",
      "6a1df9ea-9216-44d1-a38b-e528ccc302a8",
      "Sede Este",
    );
    await postSync(requestSync([op]));
    const segundaRespuesta = await postSync(requestSync([op]));
    const cuerpo = await segundaRespuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(consultorioDb.size).toBe(1);
  });
});
