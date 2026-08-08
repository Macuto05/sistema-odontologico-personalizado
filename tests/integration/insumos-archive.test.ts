/**
 * Tests de integración de POST /api/insumos/:id/archive y /reactivate
 * (contracts/insumos-api.md, US5). Mock de Prisma, mismo criterio que los demás.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const insumoDb = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    insumo: {
      findUnique: vi.fn(async ({ where }: any) => insumoDb.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => {
        const actual = insumoDb.get(where.id);
        const actualizado = { ...actual, ...data, updatedAt: new Date() };
        insumoDb.set(where.id, actualizado);
        return actualizado;
      }),
    },
  },
}));

const { POST: ARCHIVAR } = await import("@/app/api/insumos/[id]/archive/route");
const { POST: REACTIVAR } = await import("@/app/api/insumos/[id]/reactivate/route");

const ID = "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b";

function contexto(id = ID) {
  return { params: Promise.resolve({ id }) };
}

function sembrar(estado: "ACTIVO" | "ARCHIVADO", extra: Record<string, unknown> = {}) {
  insumoDb.set(ID, {
    id: ID,
    nombre: "Guantes",
    categoria: "Desechables",
    stockActual: 2,
    stockMinimo: 10,
    estado,
    version: 1,
    conflictoPendiente: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
}

describe("POST /api/insumos/:id/archive", () => {
  beforeEach(() => insumoDb.clear());

  it("200 — archiva un insumo activo conservando sus datos (FR-013, FR-015)", async () => {
    sembrar("ACTIVO");
    const respuesta = await ARCHIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.insumo.estado).toBe("ARCHIVADO");
    expect(cuerpo.yaEstabaArchivado).toBe(false);
    expect(cuerpo.insumo.stockActual).toBe(2);
    expect(cuerpo.insumo.nombre).toBe("Guantes");
  });

  it("200 — archivar uno ya archivado no es error (spec §Edge Cases)", async () => {
    sembrar("ARCHIVADO");
    const respuesta = await ARCHIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.yaEstabaArchivado).toBe(true);
  });

  it("404 — insumo inexistente", async () => {
    const respuesta = await ARCHIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error).toBe("INSUMO_NO_ENCONTRADO");
  });
});

describe("POST /api/insumos/:id/reactivate", () => {
  beforeEach(() => insumoDb.clear());

  it("200 — reactiva un insumo archivado (FR-014)", async () => {
    sembrar("ARCHIVADO");
    const respuesta = await REACTIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.insumo.estado).toBe("ACTIVO");
    // Vuelve a evaluarse como a reponer: stock 2 <= mínimo 10.
    expect(cuerpo.insumo.aReponer).toBe(true);
  });

  it("409 — rechaza reactivar uno que ya está activo", async () => {
    sembrar("ACTIVO");
    const respuesta = await REACTIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe("INSUMO_NO_ARCHIVADO");
  });

  it("404 — insumo inexistente", async () => {
    const respuesta = await REACTIVAR(new Request("http://localhost") as any, contexto());
    expect(respuesta.status).toBe(404);
  });
});
