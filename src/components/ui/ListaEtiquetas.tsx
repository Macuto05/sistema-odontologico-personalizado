import styles from "./ListaEtiquetas.module.css";

export type ColorListaEtiquetas = "azul" | "verde" | "amarillo" | "rojo";

interface ListaEtiquetasProps {
  etiquetas: string[];
  color: ColorListaEtiquetas;
}

const CLASE_POR_COLOR: Record<ColorListaEtiquetas, string | undefined> = {
  azul: styles.azul,
  verde: styles.verde,
  amarillo: styles.amarillo,
  rojo: styles.rojo,
};

/**
 * Lista de solo lectura de etiquetas de historia clínica, coloreada por categoría —
 * docs/design-system.md §6.2.1. Reutiliza los tokens semánticos de estado (info/success/
 * warning/error) en vez de inventar colores nuevos: azul = historia clínica (--color-info),
 * verde = antecedentes heredofamiliares (--color-success), amarillo = medicamentos actuales
 * (--color-warning), rojo = alergias (--color-error, convención médica habitual).
 */
export function ListaEtiquetas({ etiquetas, color }: ListaEtiquetasProps) {
  if (etiquetas.length === 0) return null;
  return (
    <div className={styles.fila}>
      {etiquetas.map((etiqueta, indice) => (
        <span key={`${etiqueta}-${indice}`} className={`${styles.etiqueta} ${CLASE_POR_COLOR[color]}`}>
          {etiqueta}
        </span>
      ))}
    </div>
  );
}
