import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma/client";

/**
 * Auth.js configurado para la cuenta única del odontólogo (Principio IV: un solo rol).
 * No hay proveedores OAuth ni registro de usuarios nuevos — la cuenta se crea vía
 * prisma/seed.ts (T018), no desde la UI.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
        });
        if (!usuario) return null;

        // Principio VII: hash bcrypt/argon2, nunca contraseñas en texto plano.
        const passwordValida = await bcrypt.compare(credentials.password, usuario.passwordHash);
        if (!passwordValida) return null;

        return { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
      },
    }),
  ],
  callbacks: {
    // 002-pantalla-inicio: copia id/nombre al JWT y de ahí a la sesión, sin consulta
    // adicional en cada request (research.md #2). `user` solo viene en el login inicial;
    // en requests siguientes el token ya trae estos datos. `trigger === "update"` es
    // el refresco explícito que dispara Configuración tras guardar el perfil (US4), para
    // que el saludo del inicio muestre el nombre nuevo sin exigir un re-login.
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.nombre = user.nombre;
      }
      if (trigger === "update" && session?.nombre) {
        token.nombre = session.nombre;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.nombre = token.nombre;
      return session;
    },
  },
};
