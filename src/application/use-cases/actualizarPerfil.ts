import { IUsuarioRepository } from "@/domain/repositories/IUsuarioRepository";
import { Usuario } from "@/domain/entities/Usuario";
import { actualizarPerfilInputSchema } from "../dto/usuarioDto";

/**
 * Caso de uso: editar nombre/email del odontólogo (US4, FR-011, FR-012).
 * Online-only por diseño (research.md #1) — única implementación de IUsuarioRepository.
 */
export async function actualizarPerfil(
  repo: IUsuarioRepository,
  id: string,
  datosCrudos: unknown,
): Promise<Usuario> {
  const datos = actualizarPerfilInputSchema.parse(datosCrudos);
  return repo.actualizarPerfil(id, datos);
}
