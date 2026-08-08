import { NextRequest, NextResponse } from "next/server";
import { CitaRepositoryPrisma } from "@/infrastructure/db/prisma/CitaRepositoryPrisma";

const repo = new CitaRepositoryPrisma();

/**
 * GET /api/citas — pull incremental *global* (todos los pacientes) usado por el motor de
 * sync (research.md #13), análogo a `GET /api/patients`. Ninguna pantalla lo llama
 * directo — el historial por paciente usa `GET /api/patients/:id/citas`.
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;

  const citas = await repo.listarTodas({
    desde,
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ citas });
}
