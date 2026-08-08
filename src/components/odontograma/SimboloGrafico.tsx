import { VarianteGrafico } from "@/domain/entities/CondicionOdontograma";
import styles from "./SimboloGrafico.module.css";

interface SimboloGraficoProps {
  variante: VarianteGrafico;
  color: "ROJO" | "AZUL";
}

const TAMANO = 14;

/** Set acotado de símbolos SVG a medida (X, flechas, zigzag, líneas) — research.md #8. */
export function SimboloGrafico({ variante, color }: SimboloGraficoProps) {
  const trazo = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";
  return (
    <svg
      className={styles.svg}
      width={TAMANO}
      height={TAMANO}
      viewBox="0 0 14 14"
      aria-hidden="true"
    >
      {renderContenido(variante, trazo)}
    </svg>
  );
}

function renderContenido(variante: VarianteGrafico, trazo: string) {
  switch (variante) {
    case "X":
    case "X_RAIZ":
      return (
        <g stroke={trazo} strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="2" x2="12" y2="12" />
          <line x1="12" y1="2" x2="2" y2="12" />
        </g>
      );
    case "ZIGZAG":
      return (
        <polyline
          points="1,2 5,6 3,7 11,12"
          fill="none"
          stroke={trazo}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "REBORDES":
      return (
        <g stroke={trazo} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M1,10 L3.5,10 L3.5,4 L6,4" />
          <path d="M8,4 L10.5,4 L10.5,10 L13,10" />
        </g>
      );
    case "LINEA_DOBLE":
      return (
        <g stroke={trazo} strokeWidth="1.5">
          <line x1="5" y1="1" x2="5" y2="13" />
          <line x1="9" y1="1" x2="9" y2="13" />
        </g>
      );
    case "PUENTE":
      return (
        <g stroke={trazo} strokeWidth="1.2" fill={trazo}>
          <circle cx="2.5" cy="7" r="1.8" stroke="none" />
          <circle cx="11.5" cy="7" r="1.8" stroke="none" />
          <line x1="4.5" y1="5.8" x2="9.5" y2="5.8" />
          <line x1="4.5" y1="8.2" x2="9.5" y2="8.2" />
        </g>
      );
    case "DPR":
      return (
        <g stroke={trazo} fill="none" strokeLinecap="round">
          <path d="M2,2.5 Q-0.3,7 2,11.5" strokeWidth="2" />
          <path d="M12,2.5 Q14.3,7 12,11.5" strokeWidth="2" />
          <path d="M2,7 Q4.5,4.5 7,7 Q9.5,9.5 12,7" strokeWidth="0.9" />
        </g>
      );
    case "LINEA_SOLIDA":
      return <line x1="1" y1="7" x2="13" y2="7" stroke={trazo} strokeWidth="2" />;
    case "LINEA_VERTICAL":
      return <line x1="7" y1="1" x2="7" y2="13" stroke={trazo} strokeWidth="2" />;
    case "LINEA_PUNTEADA":
      return (
        <line x1="1" y1="7" x2="13" y2="7" stroke={trazo} strokeWidth="2" strokeDasharray="2,2" />
      );
    case "FLECHA_RECTA":
      return (
        <g stroke={trazo} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="1" y1="7" x2="12" y2="7" />
          <polyline points="9,4 12,7 9,10" />
        </g>
      );
    case "FLECHA_CURVA":
      return (
        <g stroke={trazo} strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M2,10 Q7,1 12,7" />
          <polyline points="9,5 12,7 10,10" />
        </g>
      );
    case "FLECHAS_CRUZADAS":
      return (
        <g stroke={trazo} strokeWidth="1.3" strokeLinecap="round" fill="none">
          <path d="M2,3 Q7,7 2,11" />
          <polyline points="4,9 2,11 1,8" />
          <path d="M12,3 Q7,7 12,11" />
          <polyline points="10,9 12,11 13,8" />
        </g>
      );
    case "FLECHA_APICAL":
      return (
        <g stroke={trazo} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="7" y1="1" x2="7" y2="12" />
          <polyline points="4,9 7,12 10,9" />
        </g>
      );
    case "FLECHA_OCLUSAL":
      return (
        <g stroke={trazo} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="7" y1="13" x2="7" y2="2" />
          <polyline points="4,5 7,2 10,5" />
        </g>
      );
    case "CUADRO":
      return <rect x="3" y="3" width="8" height="8" fill="none" stroke={trazo} strokeWidth="1.5" />;
    default:
      return null;
  }
}
