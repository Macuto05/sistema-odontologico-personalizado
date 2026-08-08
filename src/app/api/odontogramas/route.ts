import { NextRequest, NextResponse } from "next/server";
import { OdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/OdontogramaRepositoryPrisma";

const repo = new OdontogramaRepositoryPrisma();

/**
 * GET /api/odontogramas — pull incremental *global* usado por el motor de sync
 * (research.md #9), análogo a `GET /api/citas`. Ninguna pantalla lo llama directo.
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;

  const odontogramas = await repo.listarTodas({
    desde,
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ odontogramas });
}
