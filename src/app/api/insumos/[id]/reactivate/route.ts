import { NextResponse } from "next/server";
import { reactivarInsumo } from "@/application/use-cases/reactivarInsumo";
import { InsumoRepositoryPrisma } from "@/infrastructure/db/prisma/InsumoRepositoryPrisma";
import { estaAReponer } from "@/domain/entities/Insumo";
import { InsumoNoEncontradoError, InsumoNoEstaArchivadoError } from "@/domain/errors";

const repo = new InsumoRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** POST /api/insumos/:id/reactivate — contracts/insumos-api.md. Protegido por middleware. */
export async function POST(_request: Request, { params }: Contexto) {
  const { id } = await params;
  try {
    const insumo = await reactivarInsumo(repo, id);
    return NextResponse.json(
      { insumo: { ...insumo, aReponer: estaAReponer(insumo) } },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof InsumoNoEstaArchivadoError) {
      return NextResponse.json({ error: "INSUMO_NO_ARCHIVADO" }, { status: 409 });
    }
    if (err instanceof InsumoNoEncontradoError) {
      return NextResponse.json({ error: "INSUMO_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
