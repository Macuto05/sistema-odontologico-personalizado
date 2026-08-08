/**
 * Test de integración de /api/account* (contracts/account-api.md).
 *
 * Usa un mock del cliente de Prisma y de getServerSession (next-auth) — no requiere una
 * base de datos real corriendo, igual que tests/integration/patients-create.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const ID = "6a1df9ea-9216-44d1-a38b-e528ccc302a6";

let sesionActual: { user: { id: string } } | null = { user: { id: ID } };
let usuarioDb: { id: string; nombre: string; email: string; passwordHash: string };

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => sesionActual),
}));

vi.mock("@/infrastructure/db/prisma/client", () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === usuarioDb.id ? { ...usuarioDb } : null)),
      update: vi.fn(async ({ where, data }: any) => {
        if (where.id !== usuarioDb.id) throw new Error("no encontrado");
        usuarioDb = { ...usuarioDb, ...data };
        return { ...usuarioDb };
      }),
    },
  },
}));

const { GET, PATCH } = await import("@/app/api/account/route");
const { POST: cambiarPassword } = await import("@/app/api/account/password/route");

function requestPatch(body: unknown) {
  return new Request("http://localhost/api/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function requestPassword(body: unknown) {
  return new Request("http://localhost/api/account/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("/api/account*", () => {
  beforeEach(async () => {
    sesionActual = { user: { id: ID } };
    usuarioDb = {
      id: ID,
      nombre: "Odontólogo de Prueba",
      email: "odontologo@example.com",
      passwordHash: await bcrypt.hash("actual123", 12),
    };
  });

  it("GET — devuelve el perfil sin passwordHash", async () => {
    const respuesta = await GET();
    const cuerpo = await respuesta.json();
    expect(cuerpo.usuario).toEqual({ id: ID, nombre: "Odontólogo de Prueba", email: "odontologo@example.com" });
    expect(cuerpo.usuario.passwordHash).toBeUndefined();
  });

  it("PATCH — 200, actualiza nombre y email (FR-011)", async () => {
    const respuesta = await PATCH(requestPatch({ nombre: "Nuevo Nombre", email: "nuevo@example.com" }));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.usuario.nombre).toBe("Nuevo Nombre");
    expect(cuerpo.usuario.email).toBe("nuevo@example.com");
  });

  it("PATCH — 422 DATOS_INVALIDOS con email inválido, sin modificar el guardado (FR-012)", async () => {
    const respuesta = await PATCH(requestPatch({ nombre: "Nombre", email: "no-valido" }));
    expect(respuesta.status).toBe(422);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toBe("DATOS_INVALIDOS");
    expect(usuarioDb.email).toBe("odontologo@example.com");
  });

  it("POST /password — 200, cambia la contraseña con la actual correcta (FR-013)", async () => {
    const respuesta = await cambiarPassword(
      requestPassword({ passwordActual: "actual123", passwordNueva: "nuevaSegura123" }),
    );
    expect(respuesta.status).toBe(200);
    await expect(bcrypt.compare("nuevaSegura123", usuarioDb.passwordHash)).resolves.toBe(true);
  });

  it("POST /password — 401 PASSWORD_ACTUAL_INCORRECTA, no modifica el hash (FR-014)", async () => {
    const hashOriginal = usuarioDb.passwordHash;
    const respuesta = await cambiarPassword(
      requestPassword({ passwordActual: "incorrecta", passwordNueva: "nuevaSegura123" }),
    );
    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toBe("PASSWORD_ACTUAL_INCORRECTA");
    expect(usuarioDb.passwordHash).toBe(hashOriginal);
  });
});
