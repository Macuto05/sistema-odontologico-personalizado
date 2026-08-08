import { CambioOdontograma } from "../entities/CambioOdontograma";

export interface OpcionesListarCambios {
  pagina?: number;
  limite?: number;
  /** Timestamp ISO — solo devuelve cambios con registradoEn > desde (pull incremental). */
  desde?: string;
}

/**
 * Puerto de dominio (Principio II) — solo `registrar`/`listar`, sin editar/eliminar, para
 * reforzar en el propio tipo que CambioOdontograma es append-only (research.md #4).
 */
export interface ICambioOdontogramaRepository {
  registrar(cambio: CambioOdontograma): Promise<void>;
  /** Ordenado por `registradoEn` descendente (más reciente primero, FR-010). */
  listarPorOdontograma(
    odontogramaId: string,
    opciones?: OpcionesListarCambios,
  ): Promise<CambioOdontograma[]>;
}
