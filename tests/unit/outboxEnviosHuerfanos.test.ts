import { describe, it, expect } from "vitest";
import { ANTIGUEDAD_ENVIO_HUERFANO_MS, esEnvioHuerfano } from "@/infrastructure/sync/outboxQueue";

const AHORA = Date.parse("2026-11-05T12:00:00.000Z");
const haceMs = (ms: number) => new Date(AHORA - ms).toISOString();

describe("esEnvioHuerfano — operaciones trabadas en ENVIANDO", () => {
  it("una operación ENVIANDO sin marca de inicio (anterior al campo) es huérfana", () => {
    expect(esEnvioHuerfano({ estado: "ENVIANDO" }, AHORA)).toBe(true);
  });

  it("un envío recién empezado NO es huérfano — todavía puede estar en vuelo", () => {
    expect(esEnvioHuerfano({ estado: "ENVIANDO", enviandoDesde: haceMs(5_000) }, AHORA)).toBe(false);
  });

  it("un envío más viejo que el umbral es huérfano", () => {
    const op = { estado: "ENVIANDO" as const, enviandoDesde: haceMs(ANTIGUEDAD_ENVIO_HUERFANO_MS + 1) };
    expect(esEnvioHuerfano(op, AHORA)).toBe(true);
  });

  it("con umbral 0 (primer ciclo tras abrir la app) todo envío anterior es huérfano", () => {
    expect(esEnvioHuerfano({ estado: "ENVIANDO", enviandoDesde: haceMs(1_000) }, AHORA, 0)).toBe(true);
  });

  it("una marca de inicio ilegible se trata como huérfana (nunca queda trabada)", () => {
    expect(esEnvioHuerfano({ estado: "ENVIANDO", enviandoDesde: "basura" }, AHORA)).toBe(true);
  });

  it("solo aplica a ENVIANDO: PENDIENTE y CONFLICTO no se tocan", () => {
    expect(esEnvioHuerfano({ estado: "PENDIENTE" }, AHORA)).toBe(false);
    expect(esEnvioHuerfano({ estado: "CONFLICTO", enviandoDesde: haceMs(10 * 60_000) }, AHORA)).toBe(false);
  });
});
