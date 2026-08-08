/**
 * Bugfix post-012: el cliente solo traducía TIPO_NO_SOPORTADO a un mensaje específico —
 * ARCHIVO_DEMASIADO_GRANDE y ALMACENAMIENTO_NO_DISPONIBLE (agregados por
 * 012-archivos-supabase-storage) caían al mensaje genérico "No se pudo subir el archivo.",
 * indistinguible de un fallo real. Reproducido con un archivo real de 21MB contra el
 * servidor: el usuario solo veía el mensaje genérico sin pista de la causa.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/sync/outboxQueue", () => ({
  hayOperacionesPendientes: vi.fn(async () => false),
}));
vi.mock("@/infrastructure/sync/syncEngine", () => ({
  sincronizarLote: vi.fn(async () => {}),
}));

const { subirArchivoPaciente } = await import("@/components/pacientes/subirArchivoPaciente");

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      json: async () => body,
    })),
  );
}

const archivoFalso = new File(["contenido"], "radiografia.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.stubGlobal("navigator", { onLine: true });
});

describe("subirArchivoPaciente — mensajes de error por código", () => {
  it("TIPO_NO_SOPORTADO -> mensaje de tipo no soportado", async () => {
    mockFetch(422, { error: "TIPO_NO_SOPORTADO" });
    const r = await subirArchivoPaciente("pac-1", archivoFalso);
    expect(r).toEqual({ ok: false, error: "Solo se aceptan imágenes o archivos PDF." });
  });

  it("ARCHIVO_DEMASIADO_GRANDE -> mensaje de tamaño, no el genérico", async () => {
    mockFetch(422, { error: "ARCHIVO_DEMASIADO_GRANDE" });
    const r = await subirArchivoPaciente("pac-1", archivoFalso);
    expect(r).toEqual({ ok: false, error: "El archivo es demasiado grande (máximo 20 MB)." });
  });

  it("ALMACENAMIENTO_NO_DISPONIBLE -> mensaje de reintentar, no el genérico", async () => {
    mockFetch(502, { error: "ALMACENAMIENTO_NO_DISPONIBLE" });
    const r = await subirArchivoPaciente("pac-1", archivoFalso);
    expect(r).toEqual({
      ok: false,
      error: "El almacenamiento no respondió. Intentá de nuevo en un momento.",
    });
  });

  it("código desconocido -> mensaje genérico (fallback)", async () => {
    mockFetch(500, { error: "ALGO_NUEVO_NO_MAPEADO" });
    const r = await subirArchivoPaciente("pac-1", archivoFalso);
    expect(r).toEqual({ ok: false, error: "No se pudo subir el archivo." });
  });

  it("respuesta sin JSON parseable -> mensaje genérico, sin romper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => {
          throw new Error("no es JSON");
        },
      })),
    );
    const r = await subirArchivoPaciente("pac-1", archivoFalso);
    expect(r).toEqual({ ok: false, error: "No se pudo subir el archivo." });
  });
});
