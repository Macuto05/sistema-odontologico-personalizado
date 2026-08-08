import {
  DatosEdicionOdontograma,
  DatosNuevoOdontograma,
  Odontograma,
  ResultadoEdicionOdontograma,
} from "../entities/Odontograma";

/**
 * Puerto de dominio (Principio II) — implementado por OdontogramaRepositoryPrisma
 * (servidor) y OdontogramaRepositoryDexie (cliente, local-first). Los casos de uso solo
 * conocen esta interfaz.
 */
export interface IOdontogramaRepository {
  /**
   * Crea vacío la primera vez para `(pacienteId, denticion)`, o devuelve el existente —
   * sin acción explícita del usuario (research.md #10). `datos.id` lo genera siempre el
   * cliente (mismo criterio que `ICitaRepository.crearOAbrir`/`DatosNuevaCita`) — tanto
   * Dexie como Prisma DEBEN usar ese id exacto al crear, nunca generar uno propio: si el
   * servidor generara otro id distinto al que el cliente ya está mostrando en pantalla, el
   * siguiente pull traería esa fila con un id diferente y la insertaría como un
   * `Odontograma` duplicado en vez de reconciliarla con la existente — exactamente el bug
   * que este contrato evita.
   */
  obtenerOCrear(datos: DatosNuevoOdontograma): Promise<Odontograma>;
  /** Reemplaza `hallazgos` completo (research.md #2). Mismo mecanismo de conflicto que
   * `ICitaRepository.editar`. */
  editar(id: string, datos: DatosEdicionOdontograma): Promise<ResultadoEdicionOdontograma>;
}
