import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { crearInsumo } from "@/application/use-cases/crearInsumo";
import { buscarInsumos } from "@/application/use-cases/buscarInsumos";
import { InsumoRepositoryPrisma } from "@/infrastructure/db/prisma/InsumoRepositoryPrisma";
import { estaAReponer } from "@/domain/entities/Insumo";

const repo = new InsumoRepositoryPrisma();

/**
 * GET /api/insumos — contracts/insumos-api.md. Usado por la UI y por el motor de sync del
 * cliente para el "pull". Protegido por middleware.
 *
 * `aReponer` viaja calculado en la respuesta (no es una columna, research.md #4) para que
 * un consumidor del contrato no tenga que rederivarlo.
 */
export async function GET(request: NextRequest | Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const categoria = url.searchParams.get("categoria") ?? undefined;
  const aReponer = url.searchParams.get("aReponer") ?? undefined;
  const estado = url.searchParams.get("estado") ?? undefined;
  const pagina = url.searchParams.get("pagina") ?? undefined;
  const limite = url.searchParams.get("limite") ?? undefined;
  const desde = url.searchParams.get("desde") ?? undefined;

  try {
    const resultado = await buscarInsumos(repo, {
      q,
      categoria,
      aReponer,
      estado,
      pagina,
      limite,
      desde,
    });
    return NextResponse.json({
      insumos: resultado.insumos.map((i) => ({ ...i, aReponer: estaAReponer(i) })),
      total: resultado.total,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "VALIDACION", detalles: err.flatten() }, { status: 422 });
    }
    throw err;
  }
}

/** POST /api/insumos — contracts/insumos-api.md. Protegido por middleware. */
export async function POST(request: NextRequest | Request) {
  const body = await request.json();

  try {
    const insumo = await crearInsumo(repo, body);
    return NextResponse.json({ ...insumo, aReponer: estaAReponer(insumo) }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "VALIDACION", detalles: err.flatten() }, { status: 422 });
    }
    throw err;
  }
}
