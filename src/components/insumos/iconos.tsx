/**
 * Íconos del módulo de Insumos — mismo criterio que `components/pacientes/iconos.tsx`:
 * SVG inline con `currentColor`, sin librería de íconos (Principio V/VI).
 */

/** Caja/paquete — identifica los datos del insumo en sí. */
export function IconoCaja() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" strokeLinejoin="round" />
      <polyline points="3.3 7 12 12 20.7 7" strokeLinejoin="round" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

/** Niveles/barras — identifica la sección de control de stock. */
export function IconoStock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="20" x2="6" y2="12" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
      <line x1="18" y1="20" x2="18" y2="15" strokeLinecap="round" />
    </svg>
  );
}

/** Métrica: total de insumos registrados. */
export function IconoInventario() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/** Métrica/alerta: insumos a reponer (FR-005, FR-006). */
export function IconoAlerta() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Métrica: categorías distintas en uso. */
export function IconoEtiquetas() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41 12 22l-9-9V3h10l7.59 7.59a2 2 0 0 1 0 2.82z" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
