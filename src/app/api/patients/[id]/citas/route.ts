import { NextResponse } from "next/server";
import { CitaRepositoryPrisma } from "@/infrastructure/db/prisma/CitaRepositoryPrisma";
import { EstadoCita } from "@/domain/entities/Cita";

const repo = new CitaRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

const ESTADOS_VALIDOS: (EstadoCita | "TODOS")[] = ["EN_CURSO", "FINALIZADA", "TODOS"];

/**
 * GET /api/patients/[id]/citas — contracts/citas-api.md. Usado por el historial de citas
 * anteriores (US7) y por el pull incremental del motor de sync (`desde`).
 */
export async function GET(request: Request, { params }: Contexto) {
  const { id } = await params;
  const url = new URL(request.url);
  const estadoParam = url.searchParams.get("estado");
  const estado =
    estadoParam && (ESTADOS_VALIDOS as string[]).includes(estadoParam)
      ? (estadoParam as EstadoCita | "TODOS")
      : undefined;
  const desde = url.searchParams.get("desde") ?? undefined;
  const pagina = url.searchParams.get("pagina");
  const limite = url.searchParams.get("limite");

  const citas = await repo.listarPorPaciente(id, {
    estado,
    desde,
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ citas });
}
