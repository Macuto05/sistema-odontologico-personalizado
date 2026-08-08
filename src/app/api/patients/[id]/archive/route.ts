import { NextResponse } from "next/server";
import { archivarPaciente } from "@/application/use-cases/archivarPaciente";
import { PacienteRepositoryPrisma } from "@/infrastructure/db/prisma/PacienteRepositoryPrisma";
import { PacienteNoEncontradoError } from "@/domain/errors";

const repo = new PacienteRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** POST /api/patients/:id/archive — contracts/patients-api.md. Protegido por middleware. */
export async function POST(_request: Request, { params }: Contexto) {
  const { id } = await params;
  try {
    const { paciente, yaEstabaArchivado } = await archivarPaciente(repo, id);
    return NextResponse.json({ paciente, yaEstabaArchivado }, { status: 200 });
  } catch (err) {
    if (err instanceof PacienteNoEncontradoError) {
      return NextResponse.json({ error: "PACIENTE_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
