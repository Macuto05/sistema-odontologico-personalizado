interface SimboloCirculoDobleProps {
  colorInterno: "ROJO" | "AZUL";
  colorExterno: "ROJO" | "AZUL";
}

/** Dos círculos concéntricos con colores fijos e independientes — Obturación defectuosa:
 * el interior (relleno) representa la restauración existente, el exterior (contorno) que
 * está defectuosa. No varía con `estadoColor`. */
export function SimboloCirculoDoble({ colorInterno, colorExterno }: SimboloCirculoDobleProps) {
  const interno = colorInterno === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  const externo = colorExterno === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="3" fill={interno} />
      <circle cx="7" cy="7" r="5.5" fill="none" stroke={externo} strokeWidth="1.5" />
    </svg>
  );
}
