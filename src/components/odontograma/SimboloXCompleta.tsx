import { CONTORNO_CORONA_VIEWBOX } from "./contornoDiente";

/** X que tacha la corona completa del diente (Ausente, Por extraer) — capa absoluta del
 * tamaño de `.corona` en DienteSvg, mismo viewBox que el contorno para que las puntas
 * queden dentro de la silueta. Solo se usa a escala "completo"; en panel/leyenda sigue el
 * ícono chico de SimboloGrafico. */
export function SimboloXCompleta({ color }: { color: "ROJO" | "AZUL" }) {
  const trazo = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  const [, , ancho = 34, alto = 30] = CONTORNO_CORONA_VIEWBOX.split(/\s+/).map(Number);
  const mx = ancho * 0.2;
  const my = alto * 0.18;
  return (
    <svg
      viewBox={CONTORNO_CORONA_VIEWBOX}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <g stroke={trazo} strokeWidth={ancho * 0.09} strokeLinecap="round">
        <line x1={mx} y1={my} x2={ancho - mx} y2={alto - my} />
        <line x1={ancho - mx} y1={my} x2={mx} y2={alto - my} />
      </g>
    </svg>
  );
}
