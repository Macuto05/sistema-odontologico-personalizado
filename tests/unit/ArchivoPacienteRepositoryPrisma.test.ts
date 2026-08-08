/**
 * @vitest-environment node
 *
 * T010/T019/T025 — ArchivoPacienteRepositoryPrisma contra Supabase Storage
 * (012-archivos-supabase-storage). Lo que se verifica acá es el **orden de operaciones**
 * entre Postgres y Storage definido en research.md #3, que es lo que evita huérfanos
 * (FR-008, FR-009).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Fila = Record<string, unknown>;

const prismaMock = {
  paciente: { findUnique: vi.fn<(args: unknown) => Promise<Fila | null>>() },
  archivoPaciente: {
    create: vi.fn<(args: { data: Fila }) => Promise<Fila>>(),
    findUnique: vi.fn<(args: unknown) => Promise<Fila | null>>(),
    findMany: vi.fn<(args: unknown) => Promise<Fila[]>>(),
    delete: vi.fn<(args: unknown) => Promise<Fila>>(),
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

const { ArchivoPacienteRepositoryPrisma } = await import(
  "@/infrastructure/db/prisma/ArchivoPacienteRepositoryPrisma"
);
const { ArchivoPacienteNoEncontradoError, PacienteNoEncontradoError } = await import(
  "@/domain/errors"
);

const PACIENTE_ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a2";
const ARCHIVO_ID = "3b7c1e4a-1111-4b1a-9f1a-2c9d3e4f5a99";

function filaFalsa(overrides: Record<string, unknown> = {}) {
  return {
    id: ARCHIVO_ID,
    pacienteId: PACIENTE_ID,
    nombreArchivo: "radiografia.jpg",
    tipo: "IMAGEN",
    tamanoBytes: 3,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

const datosNuevos = {
  pacienteId: PACIENTE_ID,
  nombreArchivo: "radiografia.jpg",
  tipo: "IMAGEN" as const,
  tipoMime: "image/jpeg",
  contenido: new Uint8Array([1, 2, 3]),
};

let repo: InstanceType<typeof ArchivoPacienteRepositoryPrisma>;

beforeEach(() => {
  vi.clearAllMocks();
  repo = new ArchivoPacienteRepositoryPrisma();
  prismaMock.paciente.findUnique.mockResolvedValue({ id: PACIENTE_ID });
  prismaMock.archivoPaciente.create.mockImplementation(async ({ data }) => ({
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
    prismaMock.archivoPaciente.create.mockImplementation(async ({ data }) => {
      orden.push("postgres");
      return { ...filaFalsa(), ...data };
    });

    await repo.agregar(datosNuevos);

    expect(orden).toEqual(["storage", "postgres"]);
  });

  it("usa como clave el mismo id con el que inserta la fila", async () => {
    await repo.agregar(datosNuevos);

    const claveUsada = storageMock.subirArchivo.mock.calls[0]![0];
    const idInsertado = prismaMock.archivoPaciente.create.mock.calls[0]![0].data.id;

    expect(claveUsada).toBe(`pacientes/${PACIENTE_ID}/${idInsertado}`);
  });

  it("guarda tamanoBytes y NO manda la columna contenido (ya no existe)", async () => {
    await repo.agregar(datosNuevos);

    const data = prismaMock.archivoPaciente.create.mock.calls[0]![0].data;
    expect(data.tamanoBytes).toBe(3);
    expect(data).not.toHaveProperty("contenido");
  });

  it("si el insert en Postgres falla, borra el objeto ya subido (compensación, FR-009)", async () => {
    prismaMock.archivoPaciente.create.mockRejectedValue(new Error("postgres caido"));

    await expect(repo.agregar(datosNuevos)).rejects.toThrow("postgres caido");

    const claveSubida = storageMock.subirArchivo.mock.calls[0]![0];
    expect(storageMock.borrarArchivo).toHaveBeenCalledWith(claveSubida);
  });

  it("si el paciente no existe, no toca Storage", async () => {
    prismaMock.paciente.findUnique.mockResolvedValue(null);

    await expect(repo.agregar(datosNuevos)).rejects.toThrow(PacienteNoEncontradoError);
    expect(storageMock.subirArchivo).not.toHaveBeenCalled();
  });
});

describe("obtenerContenido (US2)", () => {
  it("valida pertenencia en Postgres antes de leer de Storage (Principio VII)", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(
      filaFalsa({ pacienteId: "otro-paciente" }),
    );

    const resultado = await repo.obtenerContenido(PACIENTE_ID, ARCHIVO_ID);

    expect(resultado).toBeNull();
    expect(storageMock.leerArchivo).not.toHaveBeenCalled();
  });

  it("devuelve null sin tocar Storage si el archivo no existe", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(null);

    expect(await repo.obtenerContenido(PACIENTE_ID, ARCHIVO_ID)).toBeNull();
    expect(storageMock.leerArchivo).not.toHaveBeenCalled();
  });

  it("lee de Storage con la clave correcta y devuelve el contenido", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(filaFalsa());

    const resultado = await repo.obtenerContenido(PACIENTE_ID, ARCHIVO_ID);

    expect(storageMock.leerArchivo).toHaveBeenCalledWith(`pacientes/${PACIENTE_ID}/${ARCHIVO_ID}`);
    expect(Array.from(resultado!.contenido)).toEqual([1, 2, 3]);
  });
});

describe("eliminar (US3)", () => {
  it("borra el objeto de Storage ANTES de borrar la fila (research.md #3)", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(filaFalsa());
    const orden: string[] = [];
    storageMock.borrarArchivo.mockImplementation(async () => {
      orden.push("storage");
    });
    prismaMock.archivoPaciente.delete.mockImplementation(async () => {
      orden.push("postgres");
      return filaFalsa();
    });

    await repo.eliminar(PACIENTE_ID, ARCHIVO_ID);

    expect(orden).toEqual(["storage", "postgres"]);
    expect(storageMock.borrarArchivo).toHaveBeenCalledWith(
      `pacientes/${PACIENTE_ID}/${ARCHIVO_ID}`,
    );
  });

  it("si Storage falla al borrar, NO borra la fila (queda reintentable, FR-008)", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(filaFalsa());
    storageMock.borrarArchivo.mockRejectedValue(new Error("storage caido"));

    await expect(repo.eliminar(PACIENTE_ID, ARCHIVO_ID)).rejects.toThrow("storage caido");
    expect(prismaMock.archivoPaciente.delete).not.toHaveBeenCalled();
  });

  it("si el archivo no pertenece a ese paciente, no toca Storage (Principio VII)", async () => {
    prismaMock.archivoPaciente.findUnique.mockResolvedValue(
      filaFalsa({ pacienteId: "otro-paciente" }),
    );

    await expect(repo.eliminar(PACIENTE_ID, ARCHIVO_ID)).rejects.toThrow(
      ArchivoPacienteNoEncontradoError,
    );
    expect(storageMock.borrarArchivo).not.toHaveBeenCalled();
  });
});
