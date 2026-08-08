import {
  Cita,
  DatosEdicionCita,
  DatosNuevaCita,
  EstadoCita,
  ResultadoEdicionCita,
} from "../entities/Cita";

export interface OpcionesListarCitas {
  /** Default sin filtro. El historial de citas anteriores (US7) siempre pide `FINALIZADA`. */
  estado?: EstadoCita | "TODOS";
  /** Timestamp ISO — solo devuelve citas con updatedAt > desde (pull incremental). */
  desde?: string;
  pagina?: number;
  limite?: number;
}

/**
 * Puerto de dominio (Principio II) — implementado por CitaRepositoryPrisma (servidor) y
 * CitaRepositoryDexie (cliente, local-first). Los casos de uso solo conocen esta
 * interfaz, nunca la implementación concreta.
 */
export interface ICitaRepository {
  /**
   * Crea una Cita nueva en estado EN_CURSO, o devuelve la que ya está EN_CURSO para ese
   * paciente si existe una (research.md #6) — nunca crea una segunda.
   */
  crearOAbrir(datos: DatosNuevaCita): Promise<Cita>;
  obtenerPorId(id: string): Promise<Cita | null>;
  listarPorPaciente(pacienteId: string, opciones?: OpcionesListarCitas): Promise<Cita[]>;
  /** Rechaza con CitaFinalizadaError si `estado === "FINALIZADA"` (research.md #10). */
  editar(id: string, datos: DatosEdicionCita): Promise<ResultadoEdicionCita>;
  /** Idempotente si ya está FINALIZADA. Mismo mecanismo de conflicto que `editar`. */
  finalizar(id: string, baseVersion: number): Promise<ResultadoEdicionCita>;
}
