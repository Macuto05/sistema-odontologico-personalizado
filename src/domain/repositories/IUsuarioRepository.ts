import { DatosPerfilUsuario, Usuario } from "../entities/Usuario";

/**
 * Puerto de dominio (Principio II) — única implementación: UsuarioRepositoryPrisma.
 * A diferencia de IPacienteRepository, no hay contraparte Dexie: Configuración es
 * online-only (research.md #1), así que no hace falta abstraer "dónde" se persiste más
 * allá del servidor.
 */
export interface IUsuarioRepository {
  obtenerPorId(id: string): Promise<Usuario | null>;
  actualizarPerfil(id: string, datos: DatosPerfilUsuario): Promise<Usuario>;
  /** true si passwordActual coincide con el hash guardado (bcrypt.compare). */
  verificarPassword(id: string, passwordActual: string): Promise<boolean>;
  /** Recibe la contraseña en texto plano; el hasheo ocurre en la implementación (bcrypt). */
  actualizarPassword(id: string, passwordNueva: string): Promise<void>;
}
