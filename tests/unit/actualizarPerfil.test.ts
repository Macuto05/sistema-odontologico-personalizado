import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { actualizarPerfil } from "@/application/use-cases/actualizarPerfil";
import { IUsuarioRepository } from "@/domain/repositories/IUsuarioRepository";
import { Usuario } from "@/domain/entities/Usuario";

function repoFalso(overrides: Partial<IUsuarioRepository> = {}): IUsuarioRepository {
  return {
    obtenerPorId: vi.fn(async () => null),
    actualizarPerfil: vi.fn(async (id: string, datos): Promise<Usuario> => ({ id, ...datos })),
    verificarPassword: vi.fn(async () => false),
    actualizarPassword: vi.fn(async () => {}),
    ...overrides,
  };
}

const ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a6";

describe("actualizarPerfil", () => {
  it("actualiza nombre y email con datos válidos (FR-011)", async () => {
    const repo = repoFalso();
    const usuario = await actualizarPerfil(repo, ID, {
      nombre: "Nueva Odontóloga",
      email: "nueva@example.com",
    });
    expect(usuario.nombre).toBe("Nueva Odontóloga");
    expect(usuario.email).toBe("nueva@example.com");
    expect(repo.actualizarPerfil).toHaveBeenCalledWith(ID, {
      nombre: "Nueva Odontóloga",
      email: "nueva@example.com",
    });
  });

  it("rechaza un nombre vacío (FR-011)", async () => {
    const repo = repoFalso();
    await expect(
      actualizarPerfil(repo, ID, { nombre: "", email: "valido@example.com" }),
    ).rejects.toThrow(ZodError);
    expect(repo.actualizarPerfil).not.toHaveBeenCalled();
  });

  it("rechaza un email con formato inválido (FR-012)", async () => {
    const repo = repoFalso();
    await expect(
      actualizarPerfil(repo, ID, { nombre: "Alguien", email: "no-es-un-email" }),
    ).rejects.toThrow(ZodError);
    expect(repo.actualizarPerfil).not.toHaveBeenCalled();
  });
});
