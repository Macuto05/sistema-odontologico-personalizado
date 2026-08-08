import { DatosNuevoInsumo, Insumo } from "../entities/Insumo";

export interface OpcionesBusquedaInsumos {
  /** Coincidencia parcial por nombre, insensible a mayúsculas. FR-008. */
  q?: string;
  /** Categoría exacta. FR-009. */
  categoria?: string;
  /** `true` devuelve solo los insumos con stockActual <= stockMinimo. FR-004, FR-006. */
  aReponer?: boolean;
  /** Default "ACTIVO" — FR-010. */
  estado?: "ACTIVO" | "ARCHIVADO" | "TODOS";
  /** Base 1. Default 1 — FR-007 (paginación de pantalla en lotes de 10). */
  pagina?: number;
  /** Default 10. El motor de sync pide lotes más grandes. */
  limite?: number;
  /**
   * Timestamp ISO — solo devuelve insumos con updatedAt > desde. Pull incremental del
   * motor de sync, no la búsqueda de la pantalla.
   */
  desde?: string;
}

export interface ResultadoBusquedaInsumos {
  insumos: Insumo[];
  /** Total de registros que matchean los filtros, sin paginar — para "Mostrando X de Y". */
  total: number;
}

export interface DatosEdicionInsumo {
  nombre: string;
  categoria?: string | null;
  /** Editar este valor es cómo se registra una reposición o un consumo (FR-011). */
  stockActual: number;
  stockMinimo: number;
  /** version del insumo sobre la que se basó esta edición — detección de conflicto. */
  baseVersion: number;
}

export interface ResultadoEdicionInsumo {
  insumo: Insumo;
  /** true si baseVersion no coincidía con la version del servidor al momento de aplicar. */
  conflicto: boolean;
}

export interface ResultadoArchivadoInsumo {
  insumo: Insumo;
  yaEstabaArchivado: boolean;
}

/**
 * Puerto de dominio (Principio II) — implementado por InsumoRepositoryPrisma (servidor) y
 * InsumoRepositoryDexie (cliente, local-first). Los casos de uso solo conocen esta
 * interfaz, nunca la implementación concreta.
 */
export interface IInsumoRepository {
  crear(datos: DatosNuevoInsumo): Promise<Insumo>;
  buscar(opciones: OpcionesBusquedaInsumos): Promise<ResultadoBusquedaInsumos>;
  obtenerPorId(id: string): Promise<Insumo | null>;
  /**
   * Categorías distintas ya usadas por insumos activos, ordenadas alfabéticamente — arma
   * las opciones del filtro sin un catálogo separado (research.md #5).
   */
  listarCategorias(): Promise<string[]>;
  /** Cantidad de insumos ACTIVOS con stockActual <= stockMinimo — tarjeta de Inicio (FR-006). */
  contarAReponer(): Promise<number>;
  editar(id: string, datos: DatosEdicionInsumo): Promise<ResultadoEdicionInsumo>;
  archivar(id: string): Promise<ResultadoArchivadoInsumo>;
  reactivar(id: string): Promise<Insumo>;
}
