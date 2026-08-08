import { IUsuarioRepository } from "@/domain/repositories/IUsuarioRepository";
import { PasswordActualIncorrectaError } from "@/domain/errors";
import { cambiarContrasenaInputSchema } from "../dto/usuarioDto";

/**
 * Caso de uso: cambiar la contraseña del odontólogo (US4, FR-013, FR-014).
 * Verifica la contraseña actual contra el hash guardado antes de aceptar la nueva —
 * nunca se hashea/guarda nada si la verificación falla (Principio VII).
 */
export async function cambiarContrasena(
  repo: IUsuarioRepository,
  id: string,
  datosCrudos: unknown,
): Promise<void> {
  const datos = cambiarContrasenaInputSchema.parse(datosCrudos);

  const passwordValida = await repo.verificarPassword(id, datos.passwordActual);
  if (!passwordValida) {
    throw new PasswordActualIncorrectaError();
  }

  await repo.actualizarPassword(id, datos.passwordNueva);
}
