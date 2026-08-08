import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { cambiarContrasena } from "@/application/use-cases/cambiarContrasena";
import { IUsuarioRepository } from "@/domain/repositories/IUsuarioRepository";
import { PasswordActualIncorrectaError } from "@/domain/errors";

function repoFalso(overrides: Partial<IUsuarioRepository> = {}): IUsuarioRepository {
  return {
    obtenerPorId: vi.fn(async () => null),
    actualizarPerfil: vi.fn(),
    verificarPassword: vi.fn(async () => true),
    actualizarPassword: vi.fn(async () => {}),
    ...overrides,
  };
}

const ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a6";

describe("cambiarContrasena", () => {
  it("actualiza la contraseña cuando la actual es correcta (FR-013)", async () => {
    const repo = repoFalso({ verificarPassword: vi.fn(async () => true) });
    await cambiarContrasena(repo, ID, {
      passwordActual: "correcta123",
      passwordNueva: "nuevaSegura123",
    });
    expect(repo.verificarPassword).toHaveBeenCalledWith(ID, "correcta123");
    expect(repo.actualizarPassword).toHaveBeenCalledWith(ID, "nuevaSegura123");
  });

  it("rechaza el cambio si la contraseña actual es incorrecta (FR-014)", async () => {
    const repo = repoFalso({ verificarPassword: vi.fn(async () => false) });
    await expect(
      cambiarContrasena(repo, ID, { passwordActual: "incorrecta", passwordNueva: "nuevaSegura123" }),
    ).rejects.toThrow(PasswordActualIncorrectaError);
    expect(repo.actualizarPassword).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña nueva demasiado corta", async () => {
    const repo = repoFalso();
    await expect(
      cambiarContrasena(repo, ID, { passwordActual: "correcta123", passwordNueva: "corta" }),
    ).rejects.toThrow(ZodError);
    expect(repo.actualizarPassword).not.toHaveBeenCalled();
  });
});
