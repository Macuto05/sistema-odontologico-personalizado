/**
 * Test de integración de historia clínica en POST /api/patients
 * (contracts/patients-api-historia-clinica.md).
 *
 * Mismo patrón que patients-create.test.ts: mock del cliente de Prisma, sin base real.
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

describe("POST /api/patients — historia clínica (003-historia-clinica-paciente)", () => {
  beforeEach(() => {
    pacienteDb.clear();
    documentoIndex.clear();
  });

  it("201 — crea el paciente sin historia clínica cargada (FR-009, valores por defecto)", async () => {
    const respuesta = await POST(requestCrear(datosValidos));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.antecedentesPatologicos).toEqual([]);
    expect(cuerpo.antecedentesPatologicosOtros).toEqual([]);
    expect(cuerpo.antecedentesHeredofamiliares).toEqual([]);
    expect(cuerpo.medicamentosActuales).toEqual([]);
    expect(cuerpo.alergias).toEqual([]);
  });

  it("201 — persiste antecedentes patológicos, 'Otros' y los 3 campos de etiquetas (US1, revisión posterior: etiquetas independientes en vez de texto libre)", async () => {
    const respuesta = await POST(
      requestCrear({
        ...datosValidos,
        antecedentesPatologicos: ["DIABETES", "HIPERTENSION_HIPOTENSION", "OSTEOPOROSIS"],
        antecedentesPatologicosOtros: ["Fractura de cadera en 2020"],
        antecedentesHeredofamiliares: ["Madre con hipertensión"],
        medicamentosActuales: ["Metformina 850mg"],
        alergias: ["Penicilina", "Látex"],
      }),
    );
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.antecedentesPatologicos).toEqual([
      "DIABETES",
      "HIPERTENSION_HIPOTENSION",
      "OSTEOPOROSIS",
    ]);
    expect(cuerpo.antecedentesPatologicosOtros).toEqual(["Fractura de cadera en 2020"]);
    expect(cuerpo.antecedentesHeredofamiliares).toEqual(["Madre con hipertensión"]);
    expect(cuerpo.medicamentosActuales).toEqual(["Metformina 850mg"]);
    expect(cuerpo.alergias).toEqual(["Penicilina", "Látex"]);
  });

  it("422 — rechaza un antecedente patológico fuera del catálogo fijo (FR-002)", async () => {
    const respuesta = await POST(
      requestCrear({ ...datosValidos, antecedentesPatologicos: ["GRIPE_COMUN"] }),
    );
    expect(respuesta.status).toBe(422);
  });

  it("201 — descarta etiquetas en blanco de 'Otros' (edge case)", async () => {
    const respuesta = await POST(
      requestCrear({ ...datosValidos, antecedentesPatologicosOtros: ["   ", "Válida"] }),
    );
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.antecedentesPatologicosOtros).toEqual(["Válida"]);
  });
});
