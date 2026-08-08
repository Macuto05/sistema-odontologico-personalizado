import { describe, expect, it } from "vitest";
import { calcularAReponer, crearInsumoDesdeDatos, estaAReponer } from "@/domain/entities/Insumo";

/**
 * FR-004 y research.md #4: "a reponer" es un valor derivado que se recalcula en cada
 * lectura, nunca un campo guardado — estos tests fijan la regla exacta de comparación.
 */
describe("calcularAReponer", () => {
  it("está a reponer cuando el stock actual es MENOR al mínimo", () => {
    expect(calcularAReponer(2, 5)).toBe(true);
  });

  it("está a reponer cuando el stock actual es IGUAL al mínimo (FR-004: <=)", () => {
    expect(calcularAReponer(5, 5)).toBe(true);
  });

  it("NO está a reponer cuando el stock actual es mayor al mínimo", () => {
    expect(calcularAReponer(6, 5)).toBe(false);
  });

  it("con mínimo en cero, solo está a reponer si se agotó por completo (spec §Edge Cases)", () => {
    expect(calcularAReponer(0, 0)).toBe(true);
    expect(calcularAReponer(1, 0)).toBe(false);
  });
});

describe("estaAReponer", () => {
  const base = {
    id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
    nombre: "Anestesia",
    stockActual: 3,
    stockMinimo: 10,
  };

  it("deriva el estado del insumo, sin leer ningún campo guardado", () => {
    expect(estaAReponer(crearInsumoDesdeDatos(base))).toBe(true);
    expect(estaAReponer(crearInsumoDesdeDatos({ ...base, stockActual: 11 }))).toBe(false);
  });

  it("cambia de inmediato al subir el stock mínimo, sin tocar el stock actual", () => {
    const insumo = crearInsumoDesdeDatos({ ...base, stockActual: 8, stockMinimo: 5 });
    expect(estaAReponer(insumo)).toBe(false);
    // Este es el caso que un campo `aReponer` guardado dejaría desactualizado.
    expect(estaAReponer({ ...insumo, stockMinimo: 8 })).toBe(true);
  });
});
