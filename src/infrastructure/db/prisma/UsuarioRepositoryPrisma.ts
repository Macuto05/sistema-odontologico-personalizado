import bcrypt from "bcryptjs";
import { prisma } from "./client";
import { DatosPerfilUsuario, Usuario } from "@/domain/entities/Usuario";
import { IUsuarioRepository } from "@/domain/repositories/IUsuarioRepository";

/** Convierte el modelo de Prisma al dominio — nunca expone passwordHash (Principio VII). */
function aDominio(u: { id: string; nombre: string; email: string }): Usuario {
  return { id: u.id, nombre: u.nombre, email: u.email };
}

/**
 * Única implementación de IUsuarioRepository (servidor, Prisma/PostgreSQL) — Configuración
 * es online-only, no hay contraparte Dexie (research.md #1).
 */
export class UsuarioRepositoryPrisma implements IUsuarioRepository {
  async obtenerPorId(id: string): Promise<Usuario | null> {
    const u = await prisma.usuario.findUnique({ where: { id } });
    return u ? aDominio(u) : null;
  }

  async actualizarPerfil(id: string, datos: DatosPerfilUsuario): Promise<Usuario> {
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { nombre: datos.nombre, email: datos.email },
    });
    return aDominio(actualizado);
  }

  async verificarPassword(id: string, passwordActual: string): Promise<boolean> {
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return false;
    return bcrypt.compare(passwordActual, usuario.passwordHash);
  }

  async actualizarPassword(id: string, passwordNueva: string): Promise<void> {
    const passwordHash = await bcrypt.hash(passwordNueva, 12);
    await prisma.usuario.update({ where: { id }, data: { passwordHash } });
  }
}
