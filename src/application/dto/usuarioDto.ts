import { z } from "zod";

/** FR-011, FR-012: nombre obligatorio no vacío, email con formato válido. */
export const actualizarPerfilInputSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email inválido"),
});

export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilInputSchema>;

/**
 * FR-013: mismo largo mínimo que la contraseña de login (001-gestion-pacientes,
 * bcryptjs vía Auth.js) — no se inventa un estándar nuevo para esta pantalla.
 */
export const cambiarContrasenaInputSchema = z.object({
  passwordActual: z.string().min(1, "La contraseña actual es obligatoria"),
  passwordNueva: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres"),
});

export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaInputSchema>;
