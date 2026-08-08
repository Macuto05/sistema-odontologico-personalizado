import "next-auth";
import "next-auth/jwt";

/**
 * Amplía los tipos de Auth.js para incluir `nombre` (002-pantalla-inicio) — el saludo del
 * inicio lo lee de session.user.nombre, sin ninguna consulta adicional (research.md #2).
 */
declare module "next-auth" {
  interface User {
    nombre: string;
  }

  interface Session {
    user: {
      id: string;
      nombre: string;
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nombre: string;
  }
}
