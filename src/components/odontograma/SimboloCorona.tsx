import { CONTORNO_CORONA, CONTORNO_CORONA_VIEWBOX } from "./contornoDiente";
import styles from "./SimboloCorona.module.css";

interface SimboloCoronaProps {
  relleno: boolean;
  color: "ROJO" | "AZUL";
  letra?: string;
  /** "completo": ocupa toda la corona del diente en el diagrama (contenedor padre ya
   * dimensionado, posición absoluta). "chico": tamaño fijo de referencia (panel/leyenda). */
  escala: "completo" | "chico";
}

/** Pinta la corona completa del diente — relleno u hueco (solo contorno), con una letra
 * opcional superpuesta. Usado por Corona (relleno + "C") y Diente por erupcionar (hueco,
 * sin letra) — a diferencia del resto del catálogo, no se renderiza como ícono chico
 * superpuesto sino ocupando la pieza entera. A escala "completo" calca el mismo contorno
 * de diente que DienteSvg (contornoDiente.ts) para que el overlay case exacto. */
export function SimboloCorona({ relleno, color, letra, escala }: SimboloCoronaProps) {
  const colorVar = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";

  if (escala === "completo") {
    return (
      <svg className={styles.completo} viewBox={CONTORNO_CORONA_VIEWBOX} aria-hidden="true">
        <path
          d={CONTORNO_CORONA}
          fill={relleno ? colorVar : "transparent"}
          stroke={colorVar}
          strokeWidth={2}
        />
        {letra && (
          <text
            x="17"
            y="17"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="700"
            fill={relleno ? "white" : colorVar}
          >
            {letra}
          </text>
        )}
      </svg>
    );
  }

  return (
    <span
      className={styles.chico}
      style={{
        borderColor: colorVar,
        backgroundColor: relleno ? colorVar : "transparent",
        color: relleno ? "white" : colorVar,
      }}
      aria-hidden="true"
    >
      {letra}
    </span>
  );
}
