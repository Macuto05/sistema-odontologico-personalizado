import { NextRequest, NextResponse } from "next/server";
import { ItemPlanTratamientoRepositoryPrisma } from "@/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma";

const repo = new ItemPlanTratamientoRepositoryPrisma();

/**
 * GET /api/plan-tratamiento — pull incremental *global* usado por el motor de sync.
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;

  const items = await repo.listarTodas({
    desde,
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ items });
}
