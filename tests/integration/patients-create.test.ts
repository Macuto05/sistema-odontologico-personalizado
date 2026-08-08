/**
 * Test de integración de POST /api/patients (contracts/patients-api.md).
 *
 * Usa un mock del cliente de Prisma (no requiere una base de datos real corriendo) para
 * verificar el cableado ruta → caso de uso → repositorio. Para una verificación de punta a
 * punta contra PostgreSQL real, correr con TEST_DATABASE_URL configurada y sin este mock.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const pacienteDb = new Map<string, any>();
const documentoIndex = new Map<string, string>();

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    paciente: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return pacienteDb.get(where.id) ?? null;
        if (where.documentoIdentidad) {
          const id = documentoIndex.get(where.documentoIdentidad);
          return id ? pacienteDb.get(id) : null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const registro = { ...data, createdAt: new Date(), updatedAt: new Date() };
        pacienteDb.set(data.id, registro);
        documentoIndex.set(data.documentoIdentidad, data.id);
        return registro;
      }),
    },
  },
}));

const { POST } = await import("@/app/api/patients/route");

function requestCrear(body: unknown) {
  return new Request("http://localhost/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombreCompleto: "Juana Pérez",
  documentoIdentidad: "12345678",
  fechaNacimiento: "1990-01-01",
};

describe("POST /api/patients", () => {
  beforeEach(() => {
    pacienteDb.clear();
    documentoIndex.clear();
  });

  it("201 — crea el paciente con datos válidos", async () => {
    const respuesta = await POST(requestCrear(datosValidos));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.estado).toBe("ACTIVO");
    expect(cuerpo.documentoIdentidad).toBe("12345678");
  });

  it("409 DOCUMENTO_DUPLICADO — rechaza un documento ya existente (FR-004)", async () => {
    await POST(requestCrear(datosValidos));
    const respuesta = await POST(
      requestCrear({ ...datosValidos, id: "c3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6c" }),
    );
    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toBe("DOCUMENTO_DUPLICADO");
    expect(cuerpo.pacienteExistente).toBeDefined();
  });

  it("422 — rechaza si falta un campo obligatorio (FR-002)", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, nombreCompleto: "" }));
    expect(respuesta.status).toBe(422);
  });

  it("201 — persiste el género cuando se envía", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, genero: "MASCULINO" }));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.genero).toBe("MASCULINO");
  });

  it("422 — rechaza un género fuera del enum permitido", async () => {
    const respuesta = await POST(requestCrear({ ...datosValidos, genero: "INVALIDO" }));
    expect(respuesta.status).toBe(422);
  });
});
