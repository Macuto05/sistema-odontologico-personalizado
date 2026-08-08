import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { editarInsumo } from "@/application/use-cases/editarInsumo";
import { InsumoRepositoryPrisma } from "@/infrastructure/db/prisma/InsumoRepositoryPrisma";
import { estaAReponer } from "@/domain/entities/Insumo";
import { InsumoArchivadoError, InsumoNoEncontradoError } from "@/domain/errors";

const repo = new InsumoRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** PUT /api/insumos/:id — contracts/insumos-api.md. Protegido por middleware. */
export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const body = await request.json();

  try {
    const { insumo, conflicto } = await editarInsumo(repo, id, body);
    const conAReponer = { ...insumo, aReponer: estaAReponer(insumo) };
    if (conflicto) {
      return NextResponse.json({ error: "CONFLICTO_VERSION", insumo: conAReponer }, { status: 409 });
    }
    return NextResponse.json(conAReponer, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "VALIDACION", detalles: err.flatten() }, { status: 422 });
    }
    if (err instanceof InsumoArchivadoError) {
      return NextResponse.json({ error: "INSUMO_ARCHIVADO" }, { status: 409 });
    }
    if (err instanceof InsumoNoEncontradoError) {
      return NextResponse.json({ error: "INSUMO_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
