import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Exige sesión válida en toda ruta protegida — Principios IV y VII: ninguna API sin
 * verificación de sesión, nunca confianza implícita del lado del cliente.
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const { pathname } = request.nextUrl;

  if (token) return NextResponse.next();

  const esApi =
    pathname.startsWith("/api/patients") ||
    pathname.startsWith("/api/sync") ||
    pathname.startsWith("/api/account") ||
    pathname.startsWith("/api/consultorios") ||
    pathname.startsWith("/api/citas") ||
    pathname.startsWith("/api/odontogramas") ||
    pathname.startsWith("/api/cambios-odontograma") ||
    pathname.startsWith("/api/plan-tratamiento") ||
    pathname.startsWith("/api/insumos");
  if (esApi) {
    return NextResponse.json({ error: "NO_AUTENTICADO" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/pacientes/:path*",
    "/configuracion/:path*",
    "/insumos/:path*",
    "/citas/:path*",
    "/api/patients/:path*",
    "/api/sync/:path*",
    "/api/account/:path*",
    "/api/consultorios/:path*",
    "/api/citas/:path*",
    "/api/odontogramas/:path*",
    "/api/cambios-odontograma/:path*",
    "/api/plan-tratamiento/:path*",
    "/api/insumos/:path*",
  ],
};
