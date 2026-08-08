import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTema } from "@/hooks/useTema";

const CLAVE_TEMA = "tema";

describe("useTema", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("expone \"azul\" como estado inicial cuando no hay nada guardado (FR-003)", () => {
    const { result } = renderHook(() => useTema());
    expect(result.current.tema).toBe("azul");
  });

  it("lee el tema guardado en localStorage al montar", () => {
    localStorage.setItem(CLAVE_TEMA, "morado");
    const { result } = renderHook(() => useTema());
    expect(result.current.tema).toBe("morado");
  });

  it("setTema actualiza el estado y persiste en localStorage (FR-002, FR-004)", () => {
    const { result } = renderHook(() => useTema());

    act(() => result.current.setTema("morado"));

    expect(result.current.tema).toBe("morado");
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("morado");
  });

  it("setTema(\"azul\") revierte el tema y lo persiste", () => {
    const { result } = renderHook(() => useTema());

    act(() => result.current.setTema("morado"));
    act(() => result.current.setTema("azul"));

    expect(result.current.tema).toBe("azul");
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("azul");
  });

  it("un valor guardado corrupto (ni azul ni morado) se trata como ausente (FR-008)", () => {
    localStorage.setItem(CLAVE_TEMA, "verde-invalido");
    const { result } = renderHook(() => useTema());
    expect(result.current.tema).toBe("azul");
  });

  describe("con localStorage inaccesible (modo privado estricto, política del navegador)", () => {
    let getItemSpy: ReturnType<typeof vi.spyOn>;
    let setItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Acceso denegado", "SecurityError");
      });
      setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Acceso denegado", "SecurityError");
      });
    });

    afterEach(() => {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it("no lanza al montar y sigue devolviendo \"azul\" (FR-008)", () => {
      expect(() => renderHook(() => useTema())).not.toThrow();
      const { result } = renderHook(() => useTema());
      expect(result.current.tema).toBe("azul");
    });

    it("setTema no lanza y el tema se aplica igual para la sesión actual (FR-008)", () => {
      const { result } = renderHook(() => useTema());
      expect(() => act(() => result.current.setTema("morado"))).not.toThrow();
      expect(result.current.tema).toBe("morado");
    });
  });
});
