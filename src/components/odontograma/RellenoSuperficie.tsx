import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { HallazgoDental } from "@/domain/entities/Odontograma";
import { colorDeHallazgo } from "./simboloUtils";
import { SimboloGrafico } from "./SimboloGrafico";
import styles from "./RellenoSuperficie.module.css";

function cssColor(color: "ROJO" | "AZUL"): string {
  return color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
}

/**
 * Hallazgo de una superficie dibujado ocupando TODA la casilla de la cruz (feedback de la
 * odontóloga: los íconos chicos de 14px dentro de celdas de ~12px no se distinguían; la
 * referencia que pidió es el odontograma clásico donde la superficie afectada se pinta
 * entera). Cada tipo de símbolo conserva su identidad visual, pero a escala de celda:
 * - CIRCULO relleno (Caries, Restauración) → celda pintada del color.
 * - CIRCULO hueco (Absceso) → borde interior grueso del color.
 * - CIRCULO_DOBLE (Obturación defectuosa) → relleno del color interno + borde del externo.
 * - BADGE (OT, S, A, AT, ER, ABS, F, EX) → fondo tenue del color + texto del color.
 * - GRAFICO (Fractura, Rebordes) → el SVG estirado a toda la celda.
 * Capa absoluta (`inset: 0`) para que varios hallazgos en la misma superficie se apilen.
 */
export function RellenoSuperficie({ hallazgo }: { hallazgo: HallazgoDental }) {
  const condicion = buscarCondicion(hallazgo.condicionId);
  if (!condicion) return null;
  const simbolo = condicion.simbolo;
  const color = cssColor(colorDeHallazgo(condicion, hallazgo));

  switch (simbolo.tipo) {
    case "CIRCULO":
      return simbolo.relleno ? (
        <span className={styles.capa} style={{ background: color }} aria-hidden="true" />
      ) : (
        <span
          className={styles.capa}
          style={{ boxShadow: `inset 0 0 0 3px ${color}` }}
          aria-hidden="true"
        />
      );
    case "CIRCULO_DOBLE":
      return (
        <span
          className={styles.capa}
          style={{
            background: cssColor(simbolo.colorInterno),
            boxShadow: `inset 0 0 0 3px ${cssColor(simbolo.colorExterno)}`,
          }}
          aria-hidden="true"
        />
      );
    case "BADGE":
      return (
        <span
          className={`${styles.capa} ${styles.texto}`}
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
          aria-hidden="true"
        >
          {simbolo.texto}
        </span>
      );
    case "GRAFICO":
      return (
        <span className={`${styles.capa} ${styles.grafico}`} aria-hidden="true">
          <SimboloGrafico variante={simbolo.variante} color={colorDeHallazgo(condicion, hallazgo)} />
        </span>
      );
    default:
      return null;
  }
}
