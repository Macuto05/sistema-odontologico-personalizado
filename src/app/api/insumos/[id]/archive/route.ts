import { NextResponse } from "next/server";
import { archivarInsumo } from "@/application/use-cases/archivarInsumo";
import { InsumoRepositoryPrisma } from "@/infrastructure/db/prisma/InsumoRepositoryPrisma";
import { estaAReponer } from "@/domain/entities/Insumo";
import { InsumoNoEncontradoError } from "@/domain/errors";

const repo = new InsumoRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** POST /api/insumos/:id/archive — contracts/insumos-api.md. Protegido por middleware. */
export async function POST(_request: Request, { params }: Contexto) {
  const { id } = await params;
  try {
    const { insumo, yaEstabaArchivado } = await archivarInsumo(repo, id);
    return NextResponse.json(
      { insumo: { ...insumo, aReponer: estaAReponer(insumo) }, yaEstabaArchivado },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof InsumoNoEncontradoError) {
      return NextResponse.json({ error: "INSUMO_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
