import { db } from "./db";

/**
 * Agregados de solo lectura para las tarjetas de dashboard (Inicio, Pacientes). No forman
 * parte de ningún puerto de dominio a propósito: son lecturas locales sin lógica de negocio
 * reutilizable, mismo criterio que `db.pacientes.count()` ya usado en pacientes/page.tsx —
 * a diferencia de algo como `contarAReponer()`, que sí vive en IInsumoRepository porque
 * encapsula una regla de negocio (FR-006/FR-010). `pacientes`/`citas` no tienen `createdAt`
 * indexado en Dexie (db.ts), así que se filtra en memoria.
 */

function inicioDeMesActual(): string {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
}

export async function contarPacientesNuevosEnMes(): Promise<number> {
  const desde = inicioDeMesActual();
  return db.pacientes.toCollection().filter((p) => p.createdAt >= desde).count();
}

export async function contarCitasEnMes(): Promise<number> {
  const desde = inicioDeMesActual();
  return db.citas.toCollection().filter((c) => c.createdAt >= desde).count();
}

/** Cantidad de citas creadas por mes del `anio` dado, de Enero al mes actual si `anio` es el
 * año en curso (los meses futuros no tienen datos que mostrar). Índice 0 = Enero. */
export async function obtenerCitasPorMes(anio: number): Promise<number[]> {
  const ahora = new Date();
  const esAnioActual = anio === ahora.getFullYear();
  const ultimoMes = esAnioActual ? ahora.getMonth() : 11;
  const conteos = new Array(ultimoMes + 1).fill(0);

  const citas = await db.citas.toArray();
  for (const c of citas) {
    const fecha = new Date(c.createdAt);
    if (fecha.getFullYear() !== anio) continue;
    const mes = fecha.getMonth();
    if (mes <= ultimoMes) conteos[mes] += 1;
  }
  return conteos;
}
