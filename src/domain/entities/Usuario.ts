/**
 * Entidad de dominio Usuario (el odontólogo, cuenta única). Sin dependencias de framework
 * (Principio II). A diferencia de Paciente, solo existe en el servidor — Configuración es
 * online-only (ver specs/002-pantalla-inicio/research.md #1). Nunca incluye passwordHash:
 * eso queda confinado a infrastructure/db/prisma, nunca cruza hacia application/presentación.
 */

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

export interface DatosPerfilUsuario {
  nombre: string;
  email: string;
}
