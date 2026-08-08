/**
 * @vitest-environment node
 *
 * T005 — wrappers de Supabase Storage (012-archivos-supabase-storage, research.md #1/#2).
 * Solo se verifica que se arme la clave correcta y se llame al método correspondiente del
 * SDK: no hay lógica de dominio en esta capa.
 *
 * Entorno `node` (no el `jsdom` por defecto del proyecto): el `Blob` de jsdom no implementa
 * `arrayBuffer()`, que sí tiene el Blob nativo de Node — el mismo que devuelve el SDK de
 * Supabase en producción. Mismo criterio que tests/integration/archivos-estudio.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn(async () => ({ data: { path: "x" }, error: null }));
const download = vi.fn(async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }));
const remove = vi.fn(async () => ({ data: [], error: null }));
const from = vi.fn(() => ({ upload, download, remove }));

vi.mock("@/infrastructure/storage/supabase/client", () => ({
  supabaseStorage: { storage: { from } },
}));

const {
  BUCKET_ARCHIVOS,
  AlmacenamientoNoDisponibleError,
  claveArchivoPaciente,
  claveArchivoEstudio,
  subirArchivo,
  leerArchivo,
  borrarArchivo,
} = await import("@/infrastructure/storage/supabase/archivosStorage");

describe("claves de objeto", () => {
  it("claveArchivoPaciente usa el prefijo pacientes/", () => {
    expect(claveArchivoPaciente("pac-1", "arch-1")).toBe("pacientes/pac-1/arch-1");
  });

  it("claveArchivoEstudio usa el prefijo estudios/ con cita y estudioItem", () => {
    expect(claveArchivoEstudio("cita-1", "est-1", "arch-1")).toBe(
      "estudios/cita-1/est-1/arch-1",
    );
  });
});

describe("subirArchivo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sube al bucket correcto con la clave y el content-type recibidos", async () => {
    await subirArchivo("pacientes/pac-1/arch-1", new Uint8Array([1, 2, 3]), "image/jpeg");
    expect(from).toHaveBeenCalledWith(BUCKET_ARCHIVOS);
    expect(upload).toHaveBeenCalledWith(
      "pacientes/pac-1/arch-1",
      expect.anything(),
      expect.objectContaining({ contentType: "image/jpeg" }),
    );
  });

  it("lanza AlmacenamientoNoDisponibleError si el SDK devuelve error", async () => {
    upload.mockResolvedValueOnce({ data: null, error: { message: "timeout" } } as never);
    await expect(
      subirArchivo("pacientes/pac-1/arch-1", new Uint8Array([1]), "image/png"),
    ).rejects.toThrow(AlmacenamientoNoDisponibleError);
  });
});

describe("leerArchivo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("descarga la clave pedida y devuelve los bytes", async () => {
    const bytes = await leerArchivo("pacientes/pac-1/arch-1");
    expect(from).toHaveBeenCalledWith(BUCKET_ARCHIVOS);
    expect(download).toHaveBeenCalledWith("pacientes/pac-1/arch-1");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("lanza AlmacenamientoNoDisponibleError si el SDK devuelve error", async () => {
    download.mockResolvedValueOnce({ data: null, error: { message: "timeout" } } as never);
    await expect(leerArchivo("pacientes/pac-1/arch-1")).rejects.toThrow(
      AlmacenamientoNoDisponibleError,
    );
  });
});

describe("borrarArchivo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra la clave pedida (el SDK recibe un array)", async () => {
    await borrarArchivo("pacientes/pac-1/arch-1");
    expect(from).toHaveBeenCalledWith(BUCKET_ARCHIVOS);
    expect(remove).toHaveBeenCalledWith(["pacientes/pac-1/arch-1"]);
  });

  it("lanza AlmacenamientoNoDisponibleError si el SDK devuelve error", async () => {
    remove.mockResolvedValueOnce({ data: null, error: { message: "timeout" } } as never);
    await expect(borrarArchivo("pacientes/pac-1/arch-1")).rejects.toThrow(
      AlmacenamientoNoDisponibleError,
    );
  });
});
