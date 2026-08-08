import { SimboloGrafico } from "./SimboloGrafico";
import styles from "./SimboloLineaVertical.module.css";

interface SimboloLineaVerticalProps {
  color: "ROJO" | "AZUL";
  /** "completo": línea a lo largo de toda la corona del diente (Tratamiento de conducto).
   * "chico": ícono de referencia (panel/leyenda), reutiliza SimboloGrafico. */
  escala: "completo" | "chico";
}

export function SimboloLineaVertical({ color, escala }: SimboloLineaVerticalProps) {
  if (escala === "chico") {
    return <SimboloGrafico variante="LINEA_VERTICAL" color={color} />;
  }
  const colorVar = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  return <span className={styles.linea} style={{ backgroundColor: colorVar }} aria-hidden="true" />;
}
