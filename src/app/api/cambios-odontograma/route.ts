import { NextRequest, NextResponse } from "next/server";
import { CambioOdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/CambioOdontogramaRepositoryPrisma";

const repo = new CambioOdontogramaRepositoryPrisma();

/**
 * GET /api/cambios-odontograma — pull incremental *global* usado por el motor de sync
 * (research.md #9). Como CambioOdontograma es append-only (research.md #4), el pull nunca
 * necesita reconciliar ediciones, solo agregar filas nuevas.
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;

  const cambios = await repo.listarTodas({
    desde,
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ cambios });
}
