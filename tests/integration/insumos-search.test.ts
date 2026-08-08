/**
 * Tests de integración de GET /api/insumos (contracts/insumos-api.md, US2 y US3):
 * búsqueda por nombre, filtro por categoría, filtro `aReponer` y exclusión de archivados.
 *
 * El mock de Prisma implementa la semántica del `where` que usa InsumoRepositoryPrisma
 * (incluido el `$queryRaw` de "a reponer") para verificar el cableado completo de la ruta.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const insumoDb = new Map<string, any>();

function todos() {
  return [...insumoDb.values()];
}

/** Reproduce el filtrado declarativo que arma InsumoRepositoryPrisma.buscar(). */
function aplicarWhere(where: any) {
  return todos().filter((i) => {
    if (where.estado && i.estado !== where.estado) return false;
    if (where.nombre?.contains) {
      if (!i.nombre.toLowerCase().includes(where.nombre.contains.toLowerCase())) return false;
    }
    if (where.categoria && i.categoria !== where.categoria) return false;
    if (where.updatedAt?.gt && !(i.updatedAt > where.updatedAt.gt)) return false;
    if (where.AND) {
      for (const cond of where.AND) {
        if (cond.id?.in && !cond.id.in.includes(i.id)) return false;
      }
    }
    return true;
  });
}

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    insumo: {
      findMany: vi.fn(async ({ where, skip = 0, take = 10 }: any) => {
        const filtrados = aplicarWhere(where ?? {}).sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        );
        return filtrados.slice(skip, skip + take);
      }),
      count: vi.fn(async ({ where }: any) => aplicarWhere(where ?? {}).length),
    },
    // El repo usa $queryRaw para "stockActual <= stockMinimo" (comparación entre columnas).
    $queryRaw: vi.fn(async () =>
      todos()
        .filter((i) => i.stockActual <= i.stockMinimo)
        .map((i) => ({ id: i.id })),
    ),
  },
}));

const { GET } = await import("@/app/api/insumos/route");

function requestListar(query = "") {
  return new Request(`http://localhost/api/insumos${query}`) as any;
}

let contador = 0;
function sembrar(datos: {
  nombre: string;
  categoria?: string | null;
  stockActual: number;
  stockMinimo: number;
  estado?: "ACTIVO" | "ARCHIVADO";
}) {
  const id = `b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a${String(contador++).padStart(2, "0")}`;
  insumoDb.set(id, {
    id,
    categoria: null,
    estado: "ACTIVO",
    version: 1,
    conflictoPendiente: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...datos,
  });
  return id;
}

describe("GET /api/insumos", () => {
  beforeEach(() => {
    insumoDb.clear();
    contador = 0;
  });

  it("200 — lista solo insumos activos por defecto (FR-010)", async () => {
    sembrar({ nombre: "Guantes", stockActual: 20, stockMinimo: 5 });
    sembrar({ nombre: "Gasas", stockActual: 10, stockMinimo: 2, estado: "ARCHIVADO" });

    const respuesta = await GET(requestListar());
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.insumos[0].nombre).toBe("Guantes");
  });

  it("200 — busca por nombre parcial, insensible a mayúsculas (FR-008)", async () => {
    sembrar({ nombre: "Guantes de nitrilo", stockActual: 20, stockMinimo: 5 });
    sembrar({ nombre: "Gasas estériles", stockActual: 10, stockMinimo: 2 });

    const respuesta = await GET(requestListar("?q=GUANTES"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.insumos[0].nombre).toBe("Guantes de nitrilo");
  });

  it("200 — filtra por categoría exacta (FR-009)", async () => {
    sembrar({ nombre: "Guantes", categoria: "Desechables", stockActual: 20, stockMinimo: 5 });
    sembrar({ nombre: "Lidocaína", categoria: "Anestesia", stockActual: 8, stockMinimo: 3 });

    const respuesta = await GET(requestListar("?categoria=Anestesia"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.insumos[0].nombre).toBe("Lidocaína");
  });

  it("200 — sin coincidencias devuelve lista vacía, no error (spec §US3-AC3)", async () => {
    sembrar({ nombre: "Guantes", stockActual: 20, stockMinimo: 5 });
    const respuesta = await GET(requestListar("?q=inexistente"));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ insumos: [], total: 0 });
  });

  it("200 — cada insumo trae aReponer calculado (research.md #4)", async () => {
    sembrar({ nombre: "Bajo", stockActual: 2, stockMinimo: 10 });
    sembrar({ nombre: "Suficiente", stockActual: 50, stockMinimo: 10 });

    const cuerpo = await (await GET(requestListar())).json();
    const porNombre = Object.fromEntries(cuerpo.insumos.map((i: any) => [i.nombre, i.aReponer]));
    expect(porNombre).toEqual({ Bajo: true, Suficiente: false });
  });

  it("200 — aReponer=true devuelve solo los que están en o por debajo del mínimo (FR-004)", async () => {
    sembrar({ nombre: "Igual al minimo", stockActual: 5, stockMinimo: 5 });
    sembrar({ nombre: "Por debajo", stockActual: 1, stockMinimo: 5 });
    sembrar({ nombre: "Por encima", stockActual: 50, stockMinimo: 5 });

    const cuerpo = await (await GET(requestListar("?aReponer=true"))).json();
    expect(cuerpo.total).toBe(2);
    expect(cuerpo.insumos.map((i: any) => i.nombre).sort()).toEqual([
      "Igual al minimo",
      "Por debajo",
    ]);
  });

  it("200 — aReponer=true excluye los archivados, aunque tengan stock bajo (US2-AC4)", async () => {
    sembrar({ nombre: "Activo bajo", stockActual: 1, stockMinimo: 5 });
    sembrar({ nombre: "Archivado bajo", stockActual: 0, stockMinimo: 5, estado: "ARCHIVADO" });

    const cuerpo = await (await GET(requestListar("?aReponer=true"))).json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.insumos[0].nombre).toBe("Activo bajo");
  });

  it("200 — pagina de a 10 por defecto (FR-007)", async () => {
    for (let n = 0; n < 12; n++) {
      sembrar({ nombre: `Insumo ${String(n).padStart(2, "0")}`, stockActual: 9, stockMinimo: 1 });
    }

    const primera = await (await GET(requestListar("?pagina=1"))).json();
    expect(primera.insumos).toHaveLength(10);
    expect(primera.total).toBe(12);

    const segunda = await (await GET(requestListar("?pagina=2"))).json();
    expect(segunda.insumos).toHaveLength(2);
    expect(segunda.total).toBe(12);
  });

  it("200 — estado=ARCHIVADO devuelve la vista de archivados (FR-010)", async () => {
    sembrar({ nombre: "Activo", stockActual: 20, stockMinimo: 5 });
    sembrar({ nombre: "Archivado", stockActual: 20, stockMinimo: 5, estado: "ARCHIVADO" });

    const cuerpo = await (await GET(requestListar("?estado=ARCHIVADO"))).json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.insumos[0].nombre).toBe("Archivado");
  });

  it("422 — rechaza un estado inválido", async () => {
    const respuesta = await GET(requestListar("?estado=BORRADO"));
    expect(respuesta.status).toBe(422);
  });
});
