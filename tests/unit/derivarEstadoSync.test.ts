import { describe, expect, it } from "vitest";
import { derivarEstadoSync } from "@/infrastructure/sync/derivarEstadoSync";
import { OutboxOperation } from "@/infrastructure/db/dexie/db";

/**
 * Prioridad de estados del indicador (FR-009): OFFLINE > SINCRONIZANDO > CONFLICTO > AL_DIA.
 * Función pura — sin Dexie ni red, per plan.md §Testing.
 */

function opEnConflicto(overrides: Partial<OutboxOperation> = {}): OutboxOperation {
  return {
    id: "op-1",
    entidad: "PACIENTE",
    entidadId: "pac-1",
    tipo: "EDITAR",
    payload: { nombreCompleto: "Juana Pérez" },
    estado: "CONFLICTO",
    createdAt: "2026-08-07T10:00:00.000Z",
    ...overrides,
  };
}

const ENTRADA_BASE = {
  online: true,
  pendientes: 0,
  conflictos: [] as OutboxOperation[],
  progreso: { fase: "INACTIVO" as const, total: 0, enviadas: 0 },
  ultimaSincronizacion: null,
};

describe("derivarEstadoSync — estados individuales", () => {
  it("sin conexión devuelve OFFLINE con la cantidad de cambios pendientes (FR-003)", () => {
    const estado = derivarEstadoSync({ ...ENTRADA_BASE, online: false, pendientes: 4 });
    expect(estado).toEqual({ tipo: "OFFLINE", pendientes: 4 });
  });

  it("fase PUSH devuelve SINCRONIZANDO con progreso (FR-004)", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      progreso: { fase: "PUSH", total: 20, enviadas: 11 },
    });
    expect(estado).toEqual({
      tipo: "SINCRONIZANDO",
      progreso: { total: 20, enviadas: 11 },
    });
  });

  it("fase PULL devuelve SINCRONIZANDO sin progreso — el pull no tiene total conocible (FR-005)", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      progreso: { fase: "PULL", total: 0, enviadas: 0 },
    });
    expect(estado).toEqual({ tipo: "SINCRONIZANDO", progreso: null });
  });

  it("con conflictos y sin ciclo activo devuelve CONFLICTO con las entidades afectadas (FR-007)", () => {
    const estado = derivarEstadoSync({ ...ENTRADA_BASE, conflictos: [opEnConflicto()] });
    expect(estado.tipo).toBe("CONFLICTO");
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades).toHaveLength(1);
    expect(estado.entidades[0]).toMatchObject({
      entidad: "PACIENTE",
      entidadId: "pac-1",
      tipos: ["EDITAR"],
      nombre: "Juana Pérez",
    });
  });

  it("online, sin pendientes y sin conflictos devuelve AL_DIA con la última sincronización (FR-006)", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      ultimaSincronizacion: "2026-08-07T12:00:00.000Z",
    });
    expect(estado).toEqual({
      tipo: "AL_DIA",
      ultimaSincronizacion: "2026-08-07T12:00:00.000Z",
    });
  });

  it("AL_DIA tolera que nunca haya habido una sincronización previa", () => {
    const estado = derivarEstadoSync(ENTRADA_BASE);
    expect(estado).toEqual({ tipo: "AL_DIA", ultimaSincronizacion: null });
  });
});

describe("derivarEstadoSync — prioridad entre estados (FR-009)", () => {
  it("OFFLINE gana sobre SINCRONIZANDO — no se muestra progreso sin conexión", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      online: false,
      pendientes: 3,
      progreso: { fase: "PUSH", total: 5, enviadas: 2 },
    });
    expect(estado.tipo).toBe("OFFLINE");
  });

  it("OFFLINE gana sobre CONFLICTO", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      online: false,
      pendientes: 1,
      conflictos: [opEnConflicto()],
    });
    expect(estado.tipo).toBe("OFFLINE");
  });

  it("SINCRONIZANDO gana sobre CONFLICTO — la alerta espera a que termine el envío", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      progreso: { fase: "PUSH", total: 5, enviadas: 2 },
      conflictos: [opEnConflicto()],
    });
    expect(estado.tipo).toBe("SINCRONIZANDO");
  });

  it("CONFLICTO gana sobre AL_DIA aunque no quede nada pendiente de enviar", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      pendientes: 0,
      conflictos: [opEnConflicto()],
      ultimaSincronizacion: "2026-08-07T12:00:00.000Z",
    });
    expect(estado.tipo).toBe("CONFLICTO");
  });

  it("lista todos los conflictos, no solo el primero", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto(),
        opEnConflicto({ id: "op-2", entidad: "CONSULTORIO", entidadId: "con-1", tipo: "CREAR" }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades).toHaveLength(2);
  });
});

describe("derivarEstadoSync — agrupación de conflictos por registro", () => {
  /** Un mismo registro puede acumular varias operaciones fallidas; el odontólogo debe verlo
   * una sola vez. Antes esto además rompía el render de React por claves duplicadas. */
  it("agrupa varias operaciones del mismo registro en una sola entrada", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ id: "op-1", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "CREAR", payload: {} }),
        opEnConflicto({ id: "op-2", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "EDITAR", payload: {} }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades).toHaveLength(1);
    expect(estado.entidades[0]?.tipos).toEqual(["CREAR", "EDITAR"]);
  });

  it("no repite el mismo tipo de operación dentro de un registro", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ id: "op-1", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "EDITAR", payload: {} }),
        opEnConflicto({ id: "op-2", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "EDITAR", payload: {} }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.tipos).toEqual(["EDITAR"]);
  });

  it("no agrupa registros distintos de la misma entidad", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ id: "op-1", entidad: "ODONTOGRAMA", entidadId: "odo-1", payload: {} }),
        opEnConflicto({ id: "op-2", entidad: "ODONTOGRAMA", entidadId: "odo-2", payload: {} }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades).toHaveLength(2);
  });

  it("la clave entidad+entidadId resultante es única — es la que usa React para renderizar", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ id: "op-1", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "CREAR", payload: {} }),
        opEnConflicto({ id: "op-2", entidad: "ODONTOGRAMA", entidadId: "odo-1", tipo: "EDITAR", payload: {} }),
        opEnConflicto({ id: "op-3", entidad: "ODONTOGRAMA", entidadId: "odo-2", tipo: "EDITAR", payload: {} }),
        opEnConflicto({ id: "op-4", entidad: "PACIENTE", entidadId: "odo-2", tipo: "EDITAR" }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    const claves = estado.entidades.map((e) => `${e.entidad}|${e.entidadId}`);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("derivarEstadoSync — etiqueta legible del registro", () => {
  it("usa nombreCompleto cuando el payload lo trae (Paciente)", () => {
    const estado = derivarEstadoSync({ ...ENTRADA_BASE, conflictos: [opEnConflicto()] });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombre).toBe("Juana Pérez");
  });

  it("usa nombre cuando el payload lo trae (Consultorio/Insumo)", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ entidad: "CONSULTORIO", payload: { nombre: "Sede Norte" } }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombre).toBe("Sede Norte");
  });

  it("devuelve null —no el uuid— cuando la entidad no tiene nombre que mostrar", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({
          entidad: "ODONTOGRAMA",
          entidadId: "odo-1",
          payload: { id: "odo-1", pacienteId: "pac-9", denticion: "ADULTO" },
        }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombre).toBeNull();
  });

  it("rescata el nombre de cualquiera de las operaciones del registro, no solo de la primera", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        // ARCHIVAR solo manda `{ id }` — sin nombre.
        opEnConflicto({ id: "op-1", entidadId: "pac-1", tipo: "ARCHIVAR", payload: { id: "pac-1" } }),
        opEnConflicto({ id: "op-2", entidadId: "pac-1", tipo: "EDITAR" }),
      ],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombre).toBe("Juana Pérez");
  });

  it("tolera un payload con forma inesperada sin romper", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [opEnConflicto({ payload: null }), opEnConflicto({ id: "op-2", payload: "texto" })],
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombre).toBeNull();
  });
});

describe("derivarEstadoSync — identificación por paciente", () => {
  const opOdontograma = (overrides: Partial<OutboxOperation> = {}) =>
    opEnConflicto({
      entidad: "ODONTOGRAMA",
      entidadId: "odo-1",
      payload: { id: "odo-1", pacienteId: "pac-9", denticion: "ADULTO" },
      ...overrides,
    });

  it("resuelve el nombre del paciente dueño de un registro sin nombre propio", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [opOdontograma()],
      nombresPorPacienteId: { "pac-9": "Ana González" },
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]).toMatchObject({
      entidad: "ODONTOGRAMA",
      nombre: null,
      pacienteId: "pac-9",
      nombrePaciente: "Ana González",
    });
  });

  it("distingue dos odontogramas de pacientes distintos", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opOdontograma(),
        opOdontograma({
          id: "op-2",
          entidadId: "odo-2",
          payload: { id: "odo-2", pacienteId: "pac-8", denticion: "NINO" },
        }),
      ],
      nombresPorPacienteId: { "pac-9": "Ana González", "pac-8": "Luis Ramírez" },
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades.map((e) => e.nombrePaciente)).toEqual([
      "Ana González",
      "Luis Ramírez",
    ]);
  });

  it("deja nombrePaciente en null si ese paciente no está en la base local", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [opOdontograma()],
      nombresPorPacienteId: {},
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.nombrePaciente).toBeNull();
  });

  it("no inventa un paciente para entidades cuyo payload no lo referencia", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        opEnConflicto({ entidad: "CAMBIO_ODONTOGRAMA", payload: { odontogramaId: "odo-1" } }),
      ],
      nombresPorPacienteId: { "pac-9": "Ana González" },
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades[0]?.pacienteId).toBeNull();
    expect(estado.entidades[0]?.nombrePaciente).toBeNull();
  });

  it("rescata el pacienteId de cualquiera de las operaciones del registro", () => {
    const estado = derivarEstadoSync({
      ...ENTRADA_BASE,
      conflictos: [
        // FINALIZAR manda `{}` — sin pacienteId.
        opEnConflicto({ id: "op-1", entidad: "CITA", entidadId: "cita-1", tipo: "FINALIZAR", payload: {} }),
        opEnConflicto({ id: "op-2", entidad: "CITA", entidadId: "cita-1", tipo: "CREAR", payload: { id: "cita-1", pacienteId: "pac-9" } }),
      ],
      nombresPorPacienteId: { "pac-9": "Ana González" },
    });
    if (estado.tipo !== "CONFLICTO") throw new Error("tipo inesperado");
    expect(estado.entidades).toHaveLength(1);
    expect(estado.entidades[0]?.nombrePaciente).toBe("Ana González");
  });
});
