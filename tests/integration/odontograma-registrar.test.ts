/**
 * Test de integración de POST /api/sync para operaciones ODONTOGRAMA/CAMBIO_ODONTOGRAMA
 * (contracts/odontograma-api.md, research.md #2, #4, #9, #10).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const odontogramaDb = new Map<string, any>();
const cambioDb = new Map<string, any>();
const pacienteDb = new Map<string, any>();
const operacionesSincronizadas = new Map<string, any>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    odontograma: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return odontogramaDb.get(where.id) ?? null;
        if (where.pacienteId_denticion) {
          const { pacienteId, denticion } = where.pacienteId_denticion;
          return (
            [...odontogramaDb.values()].find(
              (o) => o.pacienteId === pacienteId && o.denticion === denticion,
            ) ?? null
          );
        }
        return null;
      }),
      upsert: vi.fn(async ({ where, create }: any) => {
        const { pacienteId, denticion } = where.pacienteId_denticion;
        const existente = [...odontogramaDb.values()].find(
          (o) => o.pacienteId === pacienteId && o.denticion === denticion,
        );
        if (existente) return existente;
        const nuevo = {
          ...create,
          conflictoPendiente: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        odontogramaDb.set(nuevo.id, nuevo);
        return nuevo;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const actual = odontogramaDb.get(where.id);
        const resto = { ...data };
        delete resto.version;
        const actualizado = {
          ...actual,
          ...resto,
          version: actual.version + 1,
          updatedAt: new Date(),
        };
        odontogramaDb.set(where.id, actualizado);
        return actualizado;
      }),
    },
    cambioOdontograma: {
      create: vi.fn(async ({ data }: any) => {
        cambioDb.set(data.id, data);
        return data;
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
const ODONTOGRAMA_ID = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
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
  return { id, entidad: "ODONTOGRAMA", entidadId, tipo: "CREAR", payload };
}
function operacionEditar(id: string, entidadId: string, payload: unknown, baseVersion: number) {
  return { id, entidad: "ODONTOGRAMA", entidadId, tipo: "EDITAR", payload, baseVersion };
}
function operacionCambio(id: string, entidadId: string, payload: unknown) {
  return { id, entidad: "CAMBIO_ODONTOGRAMA", entidadId, tipo: "CREAR", payload };
}

describe("POST /api/sync — operaciones ODONTOGRAMA / CAMBIO_ODONTOGRAMA", () => {
  beforeEach(() => {
    odontogramaDb.clear();
    cambioDb.clear();
    pacienteDb.clear();
    operacionesSincronizadas.clear();
  });

  it("SINCRONIZADO — crea el Odontograma cuando el paciente está activo (FR-002)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    const respuesta = await postSync(
      requestSync([
        operacionCrear(OP_1, ODONTOGRAMA_ID, { id: ODONTOGRAMA_ID, pacienteId: PACIENTE_ID, denticion: "ADULTO" }),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].odontograma.denticion).toBe("ADULTO");
  });

  it("RECHAZADO PACIENTE_ARCHIVADO — no crea el Odontograma de un paciente archivado (FR-019)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture({ estado: "ARCHIVADO" }));
    const respuesta = await postSync(
      requestSync([
        operacionCrear(OP_1, ODONTOGRAMA_ID, { id: ODONTOGRAMA_ID, pacienteId: PACIENTE_ID, denticion: "ADULTO" }),
      ]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("RECHAZADO");
    expect(cuerpo.resultados[0].error).toBe("PACIENTE_ARCHIVADO");
  });

  it("SINCRONIZADO — edita agregando un hallazgo cuando baseVersion coincide", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    odontogramaDb.set(ODONTOGRAMA_ID, {
      id: ODONTOGRAMA_ID,
      pacienteId: PACIENTE_ID,
      denticion: "ADULTO",
      hallazgos: [],
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const hallazgo = {
      id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
      condicionId: "AUSENTE",
      dientes: ["16"],
      superficie: null,
      variante: null,
      estadoColor: null,
      nota: null,
      registradoEn: new Date().toISOString(),
    };
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, ODONTOGRAMA_ID, { hallazgos: [hallazgo] }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cuerpo.resultados[0].odontograma.hallazgos).toHaveLength(1);
    expect(cuerpo.resultados[0].odontograma.version).toBe(2);
  });

  it("CONFLICTO — aplica igual la edición pero la marca cuando baseVersion no coincide (Principio III)", async () => {
    pacienteDb.set(PACIENTE_ID, pacienteFixture());
    odontogramaDb.set(ODONTOGRAMA_ID, {
      id: ODONTOGRAMA_ID,
      pacienteId: PACIENTE_ID,
      denticion: "ADULTO",
      hallazgos: [],
      version: 3,
      conflictoPendiente: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const respuesta = await postSync(
      requestSync([operacionEditar(OP_2, ODONTOGRAMA_ID, { hallazgos: [] }, 1)]),
    );
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("CONFLICTO");
  });

  it("SINCRONIZADO — registra un CambioOdontograma (CREAR puro, sin conflicto posible)", async () => {
    const cambio = {
      id: "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01",
      odontogramaId: ODONTOGRAMA_ID,
      pacienteId: PACIENTE_ID,
      denticion: "ADULTO",
      tipoCambio: "AGREGADO",
      hallazgoId: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
      dientes: ["16"],
      superficie: null,
      descripcion: "Ausente agregada en el diente 16",
      registradoEn: new Date().toISOString(),
    };
    const respuesta = await postSync(requestSync([operacionCambio(OP_3, cambio.id, cambio)]));
    const cuerpo = await respuesta.json();
    expect(cuerpo.resultados[0].estado).toBe("SINCRONIZADO");
    expect(cambioDb.has(cambio.id)).toBe(true);
  });

  it("VALIDACION — el schema rechaza un intento de EDITAR sobre CAMBIO_ODONTOGRAMA (research.md #4)", async () => {
    const respuesta = await postSync(
      requestSync([
        { id: OP_3, entidad: "CAMBIO_ODONTOGRAMA", entidadId: "x", tipo: "EDITAR", payload: {} },
      ]),
    );
    expect(respuesta.status).toBe(422);
  });
});
