/**
 * @vitest-environment node
 *
 * T011/T020 — ArchivoEstudioRepositoryPrisma contra Supabase Storage
 * (012-archivos-supabase-storage). Igual que su par de ArchivoPaciente: lo que se verifica
 * es el orden de operaciones Postgres↔Storage de research.md #3 y la validación de
 * pertenencia antes de tocar Storage (Principio VII).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const CITA_ID = "f1f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01";
const ESTUDIO_ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a4";
const ARCHIVO_ID = "3b7c1e4a-2222-4b1a-9f1a-2c9d3e4f5a99";

type Fila = Record<string, unknown>;

const prismaMock = {
  cita: {
    findUnique: vi.fn<(args: unknown) => Promise<Fila | null>>(),
    findUniqueOrThrow: vi.fn<(args: unknown) => Promise<Fila>>(),
  },
  archivoEstudio: {
    create: vi.fn<(args: { data: Fila }) => Promise<Fila>>(),
    findUnique: vi.fn<(args: unknown) => Promise<Fila | null>>(),
  },
};

const storageMock = {
  subirArchivo:
    vi.fn<(clave: string, contenido: Uint8Array, contentType: string) => Promise<void>>(),
  leerArchivo: vi.fn<(clave: string) => Promise<Uint8Array>>(),
  borrarArchivo: vi.fn<(clave: string) => Promise<void>>(),
};

vi.mock("@/infrastructure/db/prisma/client", () => ({ prisma: prismaMock }));
// El cliente real llama a createClient() al importarse y exige env vars — se stubea para
// poder usar importActual sobre archivosStorage (y así ejercitar las claves reales).
vi.mock("@/infrastructure/storage/supabase/client", () => ({
  supabaseStorage: { storage: { from: vi.fn() } },
}));
vi.mock("@/infrastructure/storage/supabase/archivosStorage", async () => {
  const real = await vi.importActual<
    typeof import("@/infrastructure/storage/supabase/archivosStorage")
  >("@/infrastructure/storage/supabase/archivosStorage");
  return { ...real, ...storageMock };
});

const { ArchivoEstudioRepositoryPrisma } = await import(
  "@/infrastructure/db/prisma/ArchivoEstudioRepositoryPrisma"
);
const { EstudioNoEncontradoError, CitaNoEncontradaError } = await import("@/domain/errors");

function citaFalsa(overrides: Record<string, unknown> = {}) {
  return {
    id: CITA_ID,
    pacienteId: "d3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a01",
    estado: "FINALIZADA",
    categoria: null,
    motivoConsulta: null,
    diagnostico: null,
    recetaItems: [],
    estudioItems: [{ id: ESTUDIO_ID, nombre: "Radiografía panorámica" }],
    version: 2,
    conflictoPendiente: null,
    finalizadaEn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function filaFalsa(overrides: Record<string, unknown> = {}) {
  return {
    id: ARCHIVO_ID,
    citaId: CITA_ID,
    estudioItemId: ESTUDIO_ID,
    nombreArchivo: "radiografia.jpg",
    tipo: "IMAGEN",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

const datosNuevos = {
  citaId: CITA_ID,
  estudioItemId: ESTUDIO_ID,
  nombreArchivo: "radiografia.jpg",
  tipo: "IMAGEN" as const,
  tipoMime: "image/jpeg",
  contenido: new Uint8Array([1, 2, 3]),
};

let repo: InstanceType<typeof ArchivoEstudioRepositoryPrisma>;

beforeEach(() => {
  vi.clearAllMocks();
  repo = new ArchivoEstudioRepositoryPrisma();
  prismaMock.cita.findUnique.mockResolvedValue(citaFalsa());
  prismaMock.cita.findUniqueOrThrow.mockResolvedValue({ ...citaFalsa(), archivos: [] });
  prismaMock.archivoEstudio.create.mockImplementation(async ({ data }) => ({
    ...filaFalsa(),
    ...data,
  }));
  storageMock.subirArchivo.mockResolvedValue(undefined);
  storageMock.borrarArchivo.mockResolvedValue(undefined);
  storageMock.leerArchivo.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

describe("agregar (US1)", () => {
  it("sube a Storage ANTES de insertar en Postgres (research.md #3)", async () => {
    const orden: string[] = [];
    storageMock.subirArchivo.mockImplementation(async () => {
      orden.push("storage");
    });
    prismaMock.archivoEstudio.create.mockImplementation(async ({ data }) => {
      orden.push("postgres");
      return { ...filaFalsa(), ...data };
    });

    await repo.agregar(datosNuevos);

    expect(orden).toEqual(["storage", "postgres"]);
  });

  it("usa como clave el mismo id con el que inserta la fila", async () => {
    await repo.agregar(datosNuevos);

    const claveUsada = storageMock.subirArchivo.mock.calls[0]![0];
    const idInsertado = prismaMock.archivoEstudio.create.mock.calls[0]![0].data.id;

    expect(claveUsada).toBe(`estudios/${CITA_ID}/${ESTUDIO_ID}/${idInsertado}`);
  });

  it("NO manda la columna contenido (ya no existe)", async () => {
    await repo.agregar(datosNuevos);

    const data = prismaMock.archivoEstudio.create.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("contenido");
  });

  it("si el insert en Postgres falla, borra el objeto ya subido (compensación, FR-009)", async () => {
    prismaMock.archivoEstudio.create.mockRejectedValue(new Error("postgres caido"));

    await expect(repo.agregar(datosNuevos)).rejects.toThrow("postgres caido");

    const claveSubida = storageMock.subirArchivo.mock.calls[0]![0];
    expect(storageMock.borrarArchivo).toHaveBeenCalledWith(claveSubida);
  });

  it("si la cita no existe, no toca Storage", async () => {
    prismaMock.cita.findUnique.mockResolvedValue(null);

    await expect(repo.agregar(datosNuevos)).rejects.toThrow(CitaNoEncontradaError);
    expect(storageMock.subirArchivo).not.toHaveBeenCalled();
  });

  it("si el estudioItemId no existe en la cita, no toca Storage", async () => {
    await expect(repo.agregar({ ...datosNuevos, estudioItemId: "no-existe" })).rejects.toThrow(
      EstudioNoEncontradoError,
    );
    expect(storageMock.subirArchivo).not.toHaveBeenCalled();
  });
});

describe("obtenerContenido (US2)", () => {
  it("valida pertenencia en Postgres antes de leer de Storage (Principio VII)", async () => {
    prismaMock.archivoEstudio.findUnique.mockResolvedValue(
      filaFalsa({ estudioItemId: "otro-estudio" }),
    );

    const resultado = await repo.obtenerContenido(CITA_ID, ESTUDIO_ID, ARCHIVO_ID);

    expect(resultado).toBeNull();
    expect(storageMock.leerArchivo).not.toHaveBeenCalled();
  });

  it("devuelve null sin tocar Storage si el archivo no existe", async () => {
    prismaMock.archivoEstudio.findUnique.mockResolvedValue(null);

    expect(await repo.obtenerContenido(CITA_ID, ESTUDIO_ID, ARCHIVO_ID)).toBeNull();
    expect(storageMock.leerArchivo).not.toHaveBeenCalled();
  });

  it("lee de Storage con la clave correcta y devuelve el contenido", async () => {
    prismaMock.archivoEstudio.findUnique.mockResolvedValue(filaFalsa());

    const resultado = await repo.obtenerContenido(CITA_ID, ESTUDIO_ID, ARCHIVO_ID);

    expect(storageMock.leerArchivo).toHaveBeenCalledWith(
      `estudios/${CITA_ID}/${ESTUDIO_ID}/${ARCHIVO_ID}`,
    );
    expect(Array.from(resultado!.contenido)).toEqual([1, 2, 3]);
  });
});
