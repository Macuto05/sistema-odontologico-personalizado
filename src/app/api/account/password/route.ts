import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/infrastructure/auth/auth.config";
import { cambiarContrasena } from "@/application/use-cases/cambiarContrasena";
import { UsuarioRepositoryPrisma } from "@/infrastructure/db/prisma/UsuarioRepositoryPrisma";
import { PasswordActualIncorrectaError } from "@/domain/errors";

const repo = new UsuarioRepositoryPrisma();

/** POST /api/account/password — contracts/account-api.md. Protegido por middleware (T009). */
export async function POST(request: NextRequest | Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NO_AUTENTICADO" }, { status: 401 });
  }

  const body = await request.json();

  try {
    await cambiarContrasena(repo, session.user.id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "DATOS_INVALIDOS", campos: Object.keys(err.flatten().fieldErrors) },
        { status: 422 },
      );
    }
    if (err instanceof PasswordActualIncorrectaError) {
      return NextResponse.json({ error: "PASSWORD_ACTUAL_INCORRECTA" }, { status: 401 });
    }
    throw err;
  }
}
