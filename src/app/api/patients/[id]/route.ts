import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { editarPaciente } from "@/application/use-cases/editarPaciente";
import { PacienteRepositoryPrisma } from "@/infrastructure/db/prisma/PacienteRepositoryPrisma";
import { DocumentoDuplicadoError, PacienteArchivadoError, PacienteNoEncontradoError } from "@/domain/errors";

const repo = new PacienteRepositoryPrisma();

type Contexto = { params: Promise<{ id: string }> };

/** PUT /api/patients/:id — contracts/patients-api.md. Protegido por middleware (T017). */
export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const body = await request.json();

  try {
    const { paciente, conflicto } = await editarPaciente(repo, id, body);
    if (conflicto) {
      return NextResponse.json({ error: "CONFLICTO_VERSION", paciente }, { status: 409 });
    }
    return NextResponse.json(paciente, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "VALIDACION", detalles: err.flatten() }, { status: 422 });
    }
    if (err instanceof DocumentoDuplicadoError) {
      return NextResponse.json(
        { error: "DOCUMENTO_DUPLICADO", pacienteExistente: err.pacienteExistente },
        { status: 409 },
      );
    }
    if (err instanceof PacienteArchivadoError) {
      return NextResponse.json({ error: "PACIENTE_ARCHIVADO" }, { status: 409 });
    }
    if (err instanceof PacienteNoEncontradoError) {
      return NextResponse.json({ error: "PACIENTE_NO_ENCONTRADO" }, { status: 404 });
    }
    throw err;
  }
}
