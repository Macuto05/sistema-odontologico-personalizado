import { NextResponse } from "next/server";
import { reactivarPaciente } from "@/application/use-cases/reactivarPaciente";
import { PacienteRepositoryPrisma } from "@/infrastructure/db/prisma/PacienteRepositoryPrisma";
import { PacienteNoEncontradoError, PacienteNoEstaArchivadoError } from "@/domain/errors";

const repo = new PacienteRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** POST /api/patients/:id/reactivate — contracts/patients-api.md. Protegido por middleware. */
export async function POST(_request: Request, { params }: Contexto) {
  const { id } = await params;
  try {
    const paciente = await reactivarPaciente(repo, id);
    return NextResponse.json({ paciente }, { status: 200 });
  } catch (err) {
    if (err instanceof PacienteNoEstaArchivadoError) {
      return NextResponse.json({ error: "PACIENTE_NO_ARCHIVADO" }, { status: 409 });
    }
    if (err instanceof PacienteNoEncontradoError) {
      return NextResponse.json({ error: "PACIENTE_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
