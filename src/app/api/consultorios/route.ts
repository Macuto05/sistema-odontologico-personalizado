import { NextResponse } from "next/server";
import { ConsultorioRepositoryPrisma } from "@/infrastructure/db/prisma/ConsultorioRepositoryPrisma";

const repo = new ConsultorioRepositoryPrisma();

/**
 * GET /api/consultorios — contracts/consultorios-api.md. Usado por el pull completo del
 * motor de sync (research.md #5). Protegido por middleware.
 */
export async function GET() {
  const consultorios = await repo.listar();
  return NextResponse.json({ consultorios });
}
