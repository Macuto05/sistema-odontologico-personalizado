import { NextResponse } from "next/server";
import { CitaRepositoryPrisma } from "@/infrastructure/db/prisma/CitaRepositoryPrisma";

const repo = new CitaRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** GET /api/citas/[id] — contracts/citas-api.md. Detalle completo. Protegido por middleware. */
export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const cita = await repo.obtenerPorId(id);
  if (!cita) {
    return NextResponse.json({ error: "CITA_NO_ENCONTRADA" }, { status: 404 });
  }
  return NextResponse.json(cita);
}
