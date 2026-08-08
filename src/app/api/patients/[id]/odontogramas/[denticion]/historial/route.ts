import { NextResponse } from "next/server";
import { OdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/OdontogramaRepositoryPrisma";
import { CambioOdontogramaRepositoryPrisma } from "@/infrastructure/db/prisma/CambioOdontogramaRepositoryPrisma";
import { Denticion } from "@/domain/entities/Odontograma";

const odontogramaRepo = new OdontogramaRepositoryPrisma();
const cambioRepo = new CambioOdontogramaRepositoryPrisma();

type Contexto = { params: Promise<{ id: string; denticion: string }> };

const DENTICIONES_VALIDAS: Denticion[] = ["ADULTO", "NINO"];

/**
 * GET /api/patients/[id]/odontogramas/[denticion]/historial — contracts/odontograma-api.md.
 * Usado por el panel de "Historial de cambios" (US4), paginado.
 */
export async function GET(request: Request, { params }: Contexto) {
  const { id, denticion: denticionParam } = await params;
  if (!DENTICIONES_VALIDAS.includes(denticionParam as Denticion)) {
    return NextResponse.json({ error: "DENTICION_INVALIDA" }, { status: 400 });
  }
  const denticion = denticionParam as Denticion;

  const odontogramas = await odontogramaRepo.listarPorPaciente(id);
  const odontograma = odontogramas.find((o) => o.denticion === denticion);
  if (!odontograma) {
    return NextResponse.json({ cambios: [] });
  }

  const url = new URL(request.url);
  const pagina = url.searchParams.get("pagina");
  const limite = url.searchParams.get("limite");

  const cambios = await cambioRepo.listarPorOdontograma(odontograma.id, {
    pagina: pagina ? Number(pagina) : undefined,
    limite: limite ? Number(limite) : undefined,
  });

  return NextResponse.json({ cambios });
}
