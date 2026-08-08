/**
 * Entidad de dominio Insumo (010-gestion-insumos). Sin dependencias de framework
 * (Principio II). Ver specs/010-gestion-insumos/data-model.md.
 */

import { ConflictoPendiente } from "./Paciente";

export type EstadoInsumo = "ACTIVO" | "ARCHIVADO";

export interface Insumo {
  id: string;
  nombre: string;
  /** Texto libre opcional (research.md #5) — no hay catálogo de categorías. */
  categoria: string | null;
  stockActual: number;
  stockMinimo: number;
  estado: EstadoInsumo;
  version: number;
  conflictoPendiente: ConflictoPendiente | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatosNuevoInsumo {
  id: string;
  nombre: string;
  categoria?: string | null;
  stockActual: number;
  stockMinimo: number;
}

/** Construye un Insumo nuevo en estado ACTIVO, version 1 — sin persistirlo. */
export function crearInsumoDesdeDatos(datos: DatosNuevoInsumo): Insumo {
  const ahora = new Date().toISOString();
  return {
    id: datos.id,
    nombre: datos.nombre,
    categoria: datos.categoria ?? null,
    stockActual: datos.stockActual,
    stockMinimo: datos.stockMinimo,
    estado: "ACTIVO",
    version: 1,
    conflictoPendiente: null,
    createdAt: ahora,
    updatedAt: ahora,
  };
}

/**
 * FR-004: "a reponer" es un valor **derivado**, nunca un campo guardado (research.md #4).
 * Se recalcula en cada lectura, así no puede quedar desincronizado del stock real — ej. si
 * se edita `stockMinimo` sin tocar `stockActual`.
 */
export function calcularAReponer(stockActual: number, stockMinimo: number): boolean {
  return stockActual <= stockMinimo;
}

/** Igual que `calcularAReponer`, sobre un insumo ya construido. */
export function estaAReponer(insumo: Pick<Insumo, "stockActual" | "stockMinimo">): boolean {
  return calcularAReponer(insumo.stockActual, insumo.stockMinimo);
}

/** FR-012: un insumo archivado no admite edición directa de sus campos. */
export function puedeEditarseInsumo(insumo: Insumo): boolean {
  return insumo.estado === "ACTIVO";
}
