interface SimboloCirculoProps {
  color: "ROJO" | "AZUL";
  relleno: boolean;
}

/** Círculo chico, relleno o hueco — ej. Caries (relleno) vs. Absceso (hueco), para no
 * confundirlos a simple vista aunque compartan la forma. */
export function SimboloCirculo({ color, relleno }: SimboloCirculoProps) {
  const trazo = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="4"
        fill={relleno ? trazo : "none"}
        stroke={trazo}
        strokeWidth={relleno ? 0 : 1.5}
      />
    </svg>
  );
}
