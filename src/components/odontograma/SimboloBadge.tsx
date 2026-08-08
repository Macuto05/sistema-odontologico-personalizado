import styles from "./SimboloBadge.module.css";

interface SimboloBadgeProps {
  texto: string;
  color: "ROJO" | "AZUL";
}

/** Badge genérico texto+color reutilizado por la mayoría del catálogo (research.md #8). */
export function SimboloBadge({ texto, color }: SimboloBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${color === "ROJO" ? styles.rojo : styles.azul}`}
      aria-hidden="true"
    >
      {texto}
    </span>
  );
}
