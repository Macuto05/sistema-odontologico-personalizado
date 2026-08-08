import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  iniciarPush,
  marcarEnviadas,
  pasarAPull,
  finalizarCiclo,
  obtenerProgreso,
  suscribirProgreso,
} from "@/infrastructure/sync/syncStatus";

/**
 * Store en memoria del progreso del ciclo de sync (research.md #4). Efímero a propósito —
 * no toca Dexie ni la red, por eso se prueba con Vitest y no con Playwright.
 */

beforeEach(() => {
  finalizarCiclo();
});

describe("syncStatus — fases del ciclo", () => {
  it("arranca inactivo", () => {
    expect(obtenerProgreso()).toEqual({ fase: "INACTIVO", total: 0, enviadas: 0 });
  });

  it("iniciarPush fija el total de operaciones a enviar", () => {
    iniciarPush(20);
    expect(obtenerProgreso()).toEqual({ fase: "PUSH", total: 20, enviadas: 0 });
  });

  it("marcarEnviadas acumula el avance dentro del mismo push", () => {
    iniciarPush(20);
    marcarEnviadas(5);
    marcarEnviadas(6);
    expect(obtenerProgreso()).toEqual({ fase: "PUSH", total: 20, enviadas: 11 });
  });

  it("no deja que el avance supere el total (FR-004: el % nunca pasa de 100)", () => {
    iniciarPush(3);
    marcarEnviadas(10);
    expect(obtenerProgreso().enviadas).toBe(3);
  });

  it("pasarAPull conserva la fase pero descarta el % — el pull no tiene total conocible", () => {
    iniciarPush(20);
    marcarEnviadas(20);
    pasarAPull();
    expect(obtenerProgreso().fase).toBe("PULL");
  });

  it("finalizarCiclo vuelve a inactivo", () => {
    iniciarPush(5);
    pasarAPull();
    finalizarCiclo();
    expect(obtenerProgreso()).toEqual({ fase: "INACTIVO", total: 0, enviadas: 0 });
  });
});

describe("syncStatus — suscripción", () => {
  it("notifica a los suscriptores en cada cambio de fase o avance", () => {
    const listener = vi.fn();
    const desuscribir = suscribirProgreso(listener);

    iniciarPush(10);
    marcarEnviadas(5);
    pasarAPull();
    finalizarCiclo();

    expect(listener).toHaveBeenCalledTimes(4);
    desuscribir();
  });

  it("deja de notificar después de desuscribirse", () => {
    const listener = vi.fn();
    const desuscribir = suscribirProgreso(listener);
    desuscribir();

    iniciarPush(10);

    expect(listener).not.toHaveBeenCalled();
  });

  it("obtenerProgreso devuelve la misma referencia mientras no haya cambios (useSyncExternalStore no debe re-renderizar de más)", () => {
    iniciarPush(10);
    expect(obtenerProgreso()).toBe(obtenerProgreso());
  });
});
