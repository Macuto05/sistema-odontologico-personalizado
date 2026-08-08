/**
 * Test de integración de GET /api/patients (contracts/patients-api.md).
 * Mock del cliente de Prisma — ver nota en patients-create.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

let pacientes: any[] = [];

function coincide(p: any, where: any): boolean {
  if (where.estado && p.estado !== where.estado) return false;
  if (where.OR) {
    const [porNombre, porDocumento] = where.OR;
    const coincideNombre = p.nombreCompleto.toLowerCase().includes(porNombre.nombreCompleto.contains.toLowerCase());
    // El filtro de documento es `{ contains }` cuando la búsqueda tiene dígitos (caso
    // normal: buscar por cédula sin el prefijo V-/E-, filtrando en tiempo real como con el
    // nombre), o un string exacto si no los tiene.
    const filtroDocumento = porDocumento.documentoIdentidad;
    const coincideDocumento =
      typeof filtroDocumento === "string"
        ? p.documentoIdentidad === filtroDocumento
        : p.documentoIdentidad.includes(filtroDocumento.contains);
    if (!coincideNombre && !coincideDocumento) return false;
  }
  if (where.updatedAt?.gt && !(p.updatedAt > where.updatedAt.gt)) return false;
  if (where.fechaNacimiento) {
    const { lte, gte } = where.fechaNacimiento;
    if (lte && !(p.fechaNacimiento <= lte)) return false;
    if (gte && !(p.fechaNacimiento >= gte)) return false;
  }
  if (Object.prototype.hasOwnProperty.call(where, "consultorioId") && p.consultorioId !== where.consultorioId) {
    return false;
  }
  return true;
}

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    paciente: {
      findMany: vi.fn(async ({ where, skip = 0, take }: any) => {
        const filtrados = pacientes
          .filter((p) => coincide(p, where))
          .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto) || a.id.localeCompare(b.id));
        return take === undefined ? filtrados.slice(skip) : filtrados.slice(skip, skip + take);
      }),
      count: vi.fn(async ({ where }: any) => pacientes.filter((p) => coincide(p, where)).length),
    },
  },
}));

const { GET } = await import("@/app/api/patients/route");

function req(query: string) {
  return new Request(`http://localhost/api/patients${query}`) as any;
}

function crearPacientes(cantidad: number, estado = "ACTIVO"): any[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: String(i + 1).padStart(3, "0"),
    nombreCompleto: `Paciente ${String(i + 1).padStart(3, "0")}`,
    documentoIdentidad: `DOC-${i + 1}`,
    estado,
    fechaNacimiento: new Date("1990-01-01"),
    telefono: null,
    email: null,
    direccion: null,
    version: 1,
    conflictoPendiente: null,
    createdAt: new Date(),
    updatedAt: new Date(`2026-01-${String((i % 28) + 1).padStart(2, "0")}`),
  }));
}

describe("GET /api/patients — búsqueda", () => {
  beforeEach(() => {
    pacientes = [
      { id: "1", nombreCompleto: "Juana Pérez", documentoIdentidad: "111", estado: "ACTIVO", fechaNacimiento: new Date("1990-01-01"), telefono: null, email: null, direccion: null, version: 1, conflictoPendiente: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", nombreCompleto: "Pedro Gómez", documentoIdentidad: "222", estado: "ARCHIVADO", fechaNacimiento: new Date("1980-01-01"), telefono: null, email: null, direccion: null, version: 1, conflictoPendiente: null, createdAt: new Date(), updatedAt: new Date() },
    ];
  });

  it("200 — sin filtros, devuelve solo activos por defecto (FR-006)", async () => {
    const respuesta = await GET(req(""));
    const cuerpo = await respuesta.json();
    expect(respuesta.status).toBe(200);
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].estado).toBe("ACTIVO");
    expect(cuerpo.total).toBe(1);
  });

  it("200 — busca por nombre parcial insensible a mayúsculas (FR-005)", async () => {
    const respuesta = await GET(req("?q=juana"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Juana Pérez");
  });

  it("200 — con estado=TODOS incluye archivados", async () => {
    const respuesta = await GET(req("?estado=TODOS"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.pacientes).toHaveLength(2);
    expect(cuerpo.total).toBe(2);
  });

  it("200 — busca por los dígitos de la cédula, sin el prefijo V-/E- (FR-005)", async () => {
    pacientes.push({
      id: "3",
      nombreCompleto: "Carlos Ruiz",
      documentoIdentidad: "V555666777",
      estado: "ACTIVO",
      fechaNacimiento: new Date("1985-01-01"),
      telefono: null,
      email: null,
      direccion: null,
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await GET(req("?q=555666777"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Carlos Ruiz");
  });

  it("200 — filtra en tiempo real con solo los primeros dígitos escritos, no el número completo", async () => {
    // Reportado por el usuario: con `endsWith` esto no encontraba nada — había que escribir
    // la cédula completa. Tiene que comportarse como la búsqueda por nombre (FR-005), que
    // ya filtra con cada letra escrita.
    pacientes.push({
      id: "3",
      nombreCompleto: "Carlos Ruiz",
      documentoIdentidad: "V555666777",
      estado: "ACTIVO",
      fechaNacimiento: new Date("1985-01-01"),
      telefono: null,
      email: null,
      direccion: null,
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await GET(req("?q=555"));
    const cuerpo = await respuesta.json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Carlos Ruiz");
  });

  it("200 — sin resultados devuelve lista vacía, no error", async () => {
    const respuesta = await GET(req("?q=noexiste"));
    const cuerpo = await respuesta.json();
    expect(respuesta.status).toBe(200);
    expect(cuerpo.pacientes).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });
});

describe("GET /api/patients — paginación (research.md #11)", () => {
  beforeEach(() => {
    pacientes = crearPacientes(25);
  });

  it("default: página 1, 10 resultados, total real sin paginar", async () => {
    const respuesta = await GET(req(""));
    const cuerpo = await respuesta.json();
    expect(cuerpo.pacientes).toHaveLength(10);
    expect(cuerpo.total).toBe(25);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Paciente 001");
  });

  it("pagina=2 trae los siguientes 10, distintos de la página 1", async () => {
    const pagina1 = await (await GET(req("?pagina=1&limite=10"))).json();
    const pagina2 = await (await GET(req("?pagina=2&limite=10"))).json();
    expect(pagina2.pacientes).toHaveLength(10);
    expect(pagina2.total).toBe(25);
    const idsPagina1 = pagina1.pacientes.map((p: any) => p.id);
    const idsPagina2 = pagina2.pacientes.map((p: any) => p.id);
    expect(idsPagina1.some((id: string) => idsPagina2.includes(id))).toBe(false);
  });

  it("última página trae el resto (5 de 25 con limite=10)", async () => {
    const cuerpo = await (await GET(req("?pagina=3&limite=10"))).json();
    expect(cuerpo.pacientes).toHaveLength(5);
    expect(cuerpo.total).toBe(25);
  });

  it("desde (research.md #12) filtra por updatedAt, sin importar la paginación", async () => {
    const cuerpo = await (
      await GET(req(`?estado=TODOS&desde=${new Date("2026-01-20").toISOString()}&limite=100`))
    ).json();
    expect(cuerpo.pacientes.length).toBeGreaterThan(0);
    expect(cuerpo.pacientes.every((p: any) => new Date(p.updatedAt) > new Date("2026-01-20"))).toBe(true);
  });
});

describe("GET /api/patients — filtro \"Filtros\" por edad y consultorio (007-representante-menor)", () => {
  const hoy = new Date();
  function fechaHaceAnios(anios: number): Date {
    return new Date(Date.UTC(hoy.getUTCFullYear() - anios, hoy.getUTCMonth(), hoy.getUTCDate()));
  }
  const consultorioA = "c1111111-1111-1111-1111-111111111111";
  const consultorioB = "c2222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    pacientes = [
      { id: "1", nombreCompleto: "Niño Chico", documentoIdentidad: null, estado: "ACTIVO", fechaNacimiento: fechaHaceAnios(5), telefono: null, email: null, direccion: null, version: 1, conflictoPendiente: null, consultorioId: consultorioA, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", nombreCompleto: "Adulto Medio", documentoIdentidad: "222", estado: "ACTIVO", fechaNacimiento: fechaHaceAnios(30), telefono: null, email: null, direccion: null, version: 1, conflictoPendiente: null, consultorioId: consultorioB, createdAt: new Date(), updatedAt: new Date() },
      { id: "3", nombreCompleto: "Adulto Mayor", documentoIdentidad: "333", estado: "ACTIVO", fechaNacimiento: fechaHaceAnios(70), telefono: null, email: null, direccion: null, version: 1, conflictoPendiente: null, consultorioId: null, createdAt: new Date(), updatedAt: new Date() },
    ];
  });

  it("edadMin y edadMax en conjunto acotan un rango (ambos inclusive)", async () => {
    const cuerpo = await (await GET(req("?estado=TODOS&edadMin=10&edadMax=40"))).json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Adulto Medio");
  });

  it("solo edadMin filtra de ahí para arriba, sin techo", async () => {
    const cuerpo = await (await GET(req("?estado=TODOS&edadMin=30"))).json();
    expect(cuerpo.pacientes.map((p: any) => p.nombreCompleto).sort()).toEqual([
      "Adulto Mayor",
      "Adulto Medio",
    ]);
  });

  it("solo edadMax filtra de ahí para abajo, sin piso", async () => {
    const cuerpo = await (await GET(req("?estado=TODOS&edadMax=10"))).json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Niño Chico");
  });

  it("consultorioId filtra por un consultorio puntual", async () => {
    const cuerpo = await (await GET(req(`?estado=TODOS&consultorioId=${consultorioA}`))).json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Niño Chico");
  });

  it("consultorioId=ninguno filtra pacientes sin consultorio asignado", async () => {
    const cuerpo = await (await GET(req("?estado=TODOS&consultorioId=ninguno"))).json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Adulto Mayor");
  });

  it("edad y consultorio combinados aplican ambos filtros a la vez", async () => {
    const cuerpo = await (
      await GET(req(`?estado=TODOS&edadMin=0&edadMax=100&consultorioId=${consultorioB}`))
    ).json();
    expect(cuerpo.pacientes).toHaveLength(1);
    expect(cuerpo.pacientes[0].nombreCompleto).toBe("Adulto Medio");
  });
});
