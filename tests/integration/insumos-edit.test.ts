/**
 * Test de integración de PUT /api/insumos/:id (contracts/insumos-api.md, US4).
 * Mock de Prisma, mismo criterio que los demás tests de integración.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const insumoDb = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    insumo: {
      findUnique: vi.fn(async ({ where }: any) => insumoDb.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => {
        const actual = insumoDb.get(where.id);
        const version =
          typeof data.version === "object" && data.version?.increment
            ? actual.version + data.version.increment
            : (data.version ?? actual.version);
        const actualizado = { ...actual, ...data, version, updatedAt: new Date() };
        insumoDb.set(where.id, actualizado);
        return actualizado;
      }),
    },
  },
}));

const { PUT } = await import("@/app/api/insumos/[id]/route");

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

function contexto(id = ID) {
  return { params: Promise.resolve({ id }) };
}

function requestEditar(body: unknown) {
  return new Request(`http://localhost/api/insumos/${ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function sembrar(estado: "ACTIVO" | "ARCHIVADO" = "ACTIVO", version = 1) {
  insumoDb.set(ID, {
    id: ID,
    nombre: "Anestesia lidocaína",
    categoria: "Anestesia",
    stockActual: 20,
    stockMinimo: 5,
    estado,
    version,
    conflictoPendiente: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const datosValidos = {
  nombre: "Anestesia lidocaína",
  categoria: "Anestesia",
  stockActual: 12,
  stockMinimo: 5,
  baseVersion: 1,
};

describe("PUT /api/insumos/:id", () => {
  beforeEach(() => insumoDb.clear());

  it("200 — actualiza el stock actual (reposición/consumo, FR-011)", async () => {
    sembrar();
    const respuesta = await PUT(requestEditar({ ...datosValidos, stockActual: 3 }), contexto());
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.stockActual).toBe(3);
    expect(cuerpo.version).toBe(2);
  });

  it("200 — recalcula aReponer al bajar el stock al mínimo (FR-004, FR-011)", async () => {
    sembrar();
    const respuesta = await PUT(requestEditar({ ...datosValidos, stockActual: 5 }), contexto());
    expect((await respuesta.json()).aReponer).toBe(true);
  });

  it("200 — recalcula aReponer al subir el stock mínimo, sin tocar el actual", async () => {
    sembrar();
    const respuesta = await PUT(
      requestEditar({ ...datosValidos, stockActual: 12, stockMinimo: 20 }),
      contexto(),
    );
    expect((await respuesta.json()).aReponer).toBe(true);
  });

  it("409 INSUMO_ARCHIVADO — un archivado no se edita sin reactivar (FR-012)", async () => {
    sembrar("ARCHIVADO");
    const respuesta = await PUT(requestEditar(datosValidos), contexto());
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe("INSUMO_ARCHIVADO");
  });

  it("409 CONFLICTO_VERSION — baseVersion desactualizada; la edición se aplica igual", async () => {
    sembrar("ACTIVO", 5);
    const respuesta = await PUT(requestEditar({ ...datosValidos, baseVersion: 1 }), contexto());
    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toBe("CONFLICTO_VERSION");
    // Principio III: nunca se descarta la edición en silencio — se aplica y se marca.
    expect(cuerpo.insumo.stockActual).toBe(12);
    expect(cuerpo.insumo.conflictoPendiente).toBeTruthy();
  });

  it("422 — rechaza un stock negativo (FR-003)", async () => {
    sembrar();
    const respuesta = await PUT(requestEditar({ ...datosValidos, stockActual: -2 }), contexto());
    expect(respuesta.status).toBe(422);
  });

  it("404 — insumo inexistente", async () => {
    const respuesta = await PUT(requestEditar(datosValidos), contexto());
    expect(respuesta.status).toBe(404);
  });
});
