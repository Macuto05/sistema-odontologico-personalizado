import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/infrastructure/auth/auth.config";
import { actualizarPerfil } from "@/application/use-cases/actualizarPerfil";
import { UsuarioRepositoryPrisma } from "@/infrastructure/db/prisma/UsuarioRepositoryPrisma";

const repo = new UsuarioRepositoryPrisma();

/**
 * GET/PATCH /api/account — contracts/account-api.md. Protegido por middleware (T009);
 * la sesión se vuelve a leer acá porque es la única forma de saber a qué Usuario
 * (id) corresponde la operación — Principio VII (IDOR: nunca operar "el usuario que sea",
 * siempre el de la sesión activa).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NO_AUTENTICADO" }, { status: 401 });
  }

  const usuario = await repo.obtenerPorId(session.user.id);
  return NextResponse.json({ usuario });
}

export async function PATCH(request: NextRequest | Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NO_AUTENTICADO" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const usuario = await actualizarPerfil(repo, session.user.id, body);
    return NextResponse.json({ usuario });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "DATOS_INVALIDOS", campos: Object.keys(err.flatten().fieldErrors) },
        { status: 422 },
      );
    }
    throw err;
  }
}
