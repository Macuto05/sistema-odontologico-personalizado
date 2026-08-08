import { NextResponse } from "next/server";
import { ItemPlanTratamientoRepositoryPrisma } from "@/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma";

const repo = new ItemPlanTratamientoRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/patients/[id]/plan-tratamiento — contracts/odontograma-api.md. Lista los
 * ItemPlanTratamiento de un paciente, ordenados por fecha descendente.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const items = await repo.listarPorPaciente(id);
  return NextResponse.json({ items });
}
