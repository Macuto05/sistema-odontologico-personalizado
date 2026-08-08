import { describe, expect, it, vi } from "vitest";
import { registrarCheckpointsOdontogramaPaciente } from "@/application/use-cases/registrarCheckpointsOdontogramaPaciente";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { Denticion, Odontograma } from "@/domain/entities/Odontograma";

function odontogramaFalso(denticion: Denticion, overrides: Partial<Odontograma> = {}): Odontograma {
  return {
    id: `odo-${denticion}`,
    pacienteId: "paciente-1",
    denticion,
    hallazgos: [],
    notas: [],
    version: 1,
    conflictoPendiente: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function odontogramaRepoFalso(): IOdontogramaRepository {
  return {
    obtenerOCrear: vi.fn(async (datos) => odontogramaFalso(datos.denticion)),
    editar: vi.fn(),
  };
}

function cambioFalso(overrides: Partial<CambioOdontograma> = {}): CambioOdontograma {
  return {
    id: `cambio-${Math.random()}`,
    odontogramaId: "odo-ADULTO",
    pacienteId: "paciente-1",
    denticion: "ADULTO",
    tipoCambio: "AGREGADO",
    hallazgoId: "hallazgo-1",
    notaId: null,
    dientes: ["11"],
    superficie: null,
    descripcion: "Ausente agregada en el diente 11",
    snapshot: null,
    registradoEn: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function cambioRepoFalso(cambiosPorOdontograma: Record<string, CambioOdontograma[]>) {
  const registrados: CambioOdontograma[] = [];
  const repo: ICambioOdontogramaRepository = {
    registrar: vi.fn(async (cambio) => {
      registrados.push(cambio);
    }),
    listarPorOdontograma: vi.fn(async (odontogramaId) => cambiosPorOdontograma[odontogramaId] ?? []),
  };
  return { repo, registrados };
}

describe("registrarCheckpointsOdontogramaPaciente (revisión posterior — cierre de sesión de edición)", () => {
  it("no crea ningún checkpoint si no hubo cambios desde el último (o nunca)", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const { repo: cambioRepo, registrados } = cambioRepoFalso({});

    await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, "paciente-1");

    expect(registrados).toHaveLength(0);
  });

  it("crea un checkpoint cuando hay cambios granulares sin archivar todavía", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const { repo: cambioRepo, registrados } = cambioRepoFalso({
      "odo-ADULTO": [cambioFalso({ tipoCambio: "AGREGADO", registradoEn: "2026-01-01T10:00:00.000Z" })],
    });

    await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, "paciente-1");

    expect(registrados).toHaveLength(1);
    expect(registrados[0]?.tipoCambio).toBe("CHECKPOINT");
    expect(registrados[0]?.odontogramaId).toBe("odo-ADULTO");
    expect(registrados[0]?.descripcion).toBe("1 cambio guardado");
    // Sin diente/hallazgo/nota puntual — no describe un cambio, sino un momento.
    expect(registrados[0]?.hallazgoId).toBeNull();
    expect(registrados[0]?.dientes).toEqual([]);
  });

  it("no vuelve a crear un checkpoint si ya no hay cambios nuevos desde el último", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const { repo: cambioRepo, registrados } = cambioRepoFalso({
      "odo-ADULTO": [
        cambioFalso({ tipoCambio: "AGREGADO", registradoEn: "2026-01-01T10:00:00.000Z" }),
        cambioFalso({
          tipoCambio: "CHECKPOINT",
          registradoEn: "2026-01-01T11:00:00.000Z",
          hallazgoId: null,
          dientes: [],
        }),
      ],
    });

    await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, "paciente-1");

    expect(registrados).toHaveLength(0);
  });

  it("cuenta solo los cambios posteriores al último checkpoint en la descripción", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const { repo: cambioRepo, registrados } = cambioRepoFalso({
      "odo-ADULTO": [
        cambioFalso({ tipoCambio: "AGREGADO", registradoEn: "2026-01-01T09:00:00.000Z" }),
        cambioFalso({
          tipoCambio: "CHECKPOINT",
          registradoEn: "2026-01-01T10:00:00.000Z",
          hallazgoId: null,
          dientes: [],
        }),
        cambioFalso({ tipoCambio: "AGREGADO", registradoEn: "2026-01-01T11:00:00.000Z" }),
        cambioFalso({ tipoCambio: "EDITADO", registradoEn: "2026-01-01T11:05:00.000Z" }),
      ],
    });

    await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, "paciente-1");

    expect(registrados).toHaveLength(1);
    expect(registrados[0]?.descripcion).toBe("2 cambios guardados");
  });

  it("revisa ambas denticiones — un checkpoint independiente por cada una con cambios", async () => {
    const odontogramaRepo = odontogramaRepoFalso();
    const { repo: cambioRepo, registrados } = cambioRepoFalso({
      "odo-ADULTO": [cambioFalso({ tipoCambio: "AGREGADO", registradoEn: "2026-01-01T10:00:00.000Z" })],
      "odo-NINO": [
        cambioFalso({
          tipoCambio: "AGREGADO",
          odontogramaId: "odo-NINO",
          denticion: "NINO",
          registradoEn: "2026-01-01T10:00:00.000Z",
        }),
      ],
    });

    await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, "paciente-1");

    expect(registrados).toHaveLength(2);
    expect(registrados.map((c) => c.denticion).sort()).toEqual(["ADULTO", "NINO"]);
  });
});
