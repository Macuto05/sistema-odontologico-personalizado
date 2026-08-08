/**
 * Test de integración de POST /api/insumos (contracts/insumos-api.md).
 *
 * Usa un mock del cliente de Prisma (no requiere una base de datos real corriendo) para
 * verificar el cableado ruta → caso de uso → repositorio, mismo criterio que
 * `patients-create.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const insumoDb = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    insumo: {
      findUnique: vi.fn(async ({ where }: any) => insumoDb.get(where.id) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const registro = { ...data, conflictoPendiente: null, createdAt: new Date(), updatedAt: new Date() };
        insumoDb.set(data.id, registro);
        return registro;
      }),
    },
  },
}));

const { POST } = await import("@/app/api/insumos/route");

function requestCrear(body: unknown) {
  return new Request("http://localhost/api/insumos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombre: "Guantes de nitrilo talla M",
  categoria: "Desechables",
  stockActual: 20,
  stockMinimo: 5,
};

describe("POST /api/insumos", () => {
  beforeEach(() => {
    insumoDb.clear();
  });

  it("201 — crea el insumo con datos válidos (FR-001)", async () => {
    const respuesta = await POST(requestCrear(datosValidos));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.estado).toBe("ACTIVO");
    expect(cuerpo.nombre).toBe("Guantes de nitrilo talla M");
    expect(cuerpo.stockActual).toBe(20);
    expect(cuerpo.version).toBe(1);
  });

  it("201 — devuelve aReponer calculado, no guardado (research.md #4)", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, stockActual: 3, stockMinimo: 5 }));
    const cuerpo = await respuesta.json();
    expect(cuerpo.aReponer).toBe(true);
  });

  it("201 — aReponer es false cuando el stock supera el mínimo", async () => {
    const respuesta = await POST(requestCrear(datosValidos));
    const cuerpo = await respuesta.json();
    expect(cuerpo.aReponer).toBe(false);
  });

  it("201 — acepta un insumo sin categoría (FR-002)", async () => {
    const respuesta = await POST(
      requestCrear({
        id: datosValidos.id,
        nombre: datosValidos.nombre,
        stockActual: datosValidos.stockActual,
        stockMinimo: datosValidos.stockMinimo,
      }),
    );
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.categoria).toBeNull();
  });

  it("422 — rechaza si falta el nombre (FR-002)", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, nombre: "" }));
    expect(respuesta.status).toBe(422);
  });

  it("422 — rechaza un stock negativo (FR-003)", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, stockActual: -1 }));
    expect(respuesta.status).toBe(422);
  });

  it("422 — rechaza un stock no entero (FR-003)", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, stockMinimo: 1.5 }));
    expect(respuesta.status).toBe(422);
  });

  it("201 — permite dos insumos con el mismo nombre (spec §Edge Cases)", async () => {
    await POST(requestCrear(datosValidos));
    const respuesta = await POST(
      requestCrear({ ...datosValidos, id: "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c" }),
    );
    expect(respuesta.status).toBe(201);
    expect(insumoDb.size).toBe(2);
  });
});
