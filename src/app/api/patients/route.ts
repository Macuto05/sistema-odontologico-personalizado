import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { crearPaciente } from "@/application/use-cases/crearPaciente";
import { buscarPacientes } from "@/application/use-cases/buscarPacientes";
import { PacienteRepositoryPrisma } from "@/infrastructure/db/prisma/PacienteRepositoryPrisma";
import { DocumentoDuplicadoError } from "@/domain/errors";

const repo = new PacienteRepositoryPrisma();

/**
 * GET /api/patients — contracts/patients-api.md. Usado por la UI (US2) y por el motor de
 * sync del cliente para el "pull" (traer el estado del servidor hacia Dexie local).
 * Protegido por middleware (T017).
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const estado = url.searchParams.get("estado") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;
  const desde = url.searchParams.get("desde") ?? undefined;
  // Filtro "Filtros" del listado (007-representante-menor).
  const edadMin = url.searchParams.get("edadMin") ?? undefined;
  const edadMax = url.searchParams.get("edadMax") ?? undefined;
  const consultorioId = url.searchParams.get("consultorioId") ?? undefined;

  try {
    const resultado = await buscarPacientes(repo, {
      q,
      estado,
      pagina,
      limite,
      desde,
      edadMin,
      edadMax,
      consultorioId,
    });
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "VALIDACION", detalles: err.flatten() }, { status: 422 });
    }
    throw err;
  }
}

/** POST /api/patients — contracts/patients-api.md. Protegido por middleware (T017). */
export async function POST(request: NextRequest | Request) {
  const body = await request.json();

  try {
    const paciente = await crearPaciente(repo, body);
    return NextResponse.json(paciente, { status: 201 });
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
    throw err;
  }
}
