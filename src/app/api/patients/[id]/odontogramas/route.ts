import { NextResponse } from "next/server";
import { OdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/OdontogramaRepositoryPrisma";

const repo = new OdontogramaRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/patients/[id]/odontogramas — contracts/odontograma-api.md. Los (hasta dos)
 * Odontograma de un paciente, uno por denticion.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const odontogramas = await repo.listarPorPaciente(id);
  return NextResponse.json({ odontogramas });
}
