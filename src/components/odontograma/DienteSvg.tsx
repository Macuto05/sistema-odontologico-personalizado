"use client";

import { HallazgoDental, Superficie } from "@/domain/entities/Odontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { SimboloHallazgo, esSimboloCoronaCompleta, esSimboloRaizCompleta } from "./simboloUtils";
import { CONTORNO_CORONA, CONTORNO_CORONA_VIEWBOX } from "./contornoDiente";
import styles from "./DienteSvg.module.css";

interface DienteSvgProps {
  numero: string;
  hallazgos: HallazgoDental[];
  /** true si el diente completo (no una superficie particular) es el objetivo seleccionado. */
  dienteSeleccionado: boolean;
  /** superficie seleccionada de este diente, si hay una. */
  superficieSeleccionada: Superficie | null;
  onClickDiente: () => void;
  onClickSuperficie: (superficie: Superficie) => void;
  /** true en el primer diente del lado derecho de cada arcada — línea divisoria
   * izquierda/derecha (análoga a la que ya separa arcada superior/inferior). */
  divisorIzquierda?: boolean;
}

const SUPERFICIES_CRUZ: { superficie: Superficie; clase: string }[] = [
  { superficie: "VESTIBULAR", clase: "arriba" },
  { superficie: "MESIAL", clase: "izquierda" },
  { superficie: "OCLUSAL_INCISAL", clase: "centro" },
  { superficie: "DISTAL", clase: "derecha" },
  { superficie: "PALATINO_LINGUAL", clase: "abajo" },
];

/**
 * Un diente: contorno clickable (diente completo, silueta de corona + raíz decorativa) +
 * cruz de 5 superficies clickables, con los hallazgos vigentes superpuestos (FR-001,
 * FR-003, FR-004). Los hallazgos "de corona completa" (Corona, Tratamiento de conducto —
 * ver `esSimboloCoronaCompleta`) se pintan en una capa absoluta que cubre toda la corona;
 * los hallazgos "de raíz" (Resto radicular — ver `esSimboloRaizCompleta`) se pintan sobre
 * la raíz decorativa en vez de la corona, para distinguirlos de "Por extraer" (misma X,
 * pero sobre la corona porque ahí sí queda diente); el resto se apila como íconos chicos.
 * Simplificación de v1: mesial/distal se ubican siempre izquierda/derecha, sin espejar por
 * cuadrante — no afecta la corrección de los datos, solo el detalle visual.
 */
export function DienteSvg({
  numero,
  hallazgos,
  dienteSeleccionado,
  superficieSeleccionada,
  onClickDiente,
  onClickSuperficie,
  divisorIzquierda = false,
}: DienteSvgProps) {
  const hallazgosDiente = hallazgos.filter((h) => h.superficie === null);
  const hallazgosCoronaCompleta = hallazgosDiente.filter((h) => {
    const condicion = buscarCondicion(h.condicionId);
    return condicion && esSimboloCoronaCompleta(condicion);
  });
  const hallazgosRaizCompleta = hallazgosDiente.filter((h) => {
    const condicion = buscarCondicion(h.condicionId);
    return condicion && esSimboloRaizCompleta(condicion);
  });
  const hallazgosIconoChico = hallazgosDiente.filter((h) => {
    const condicion = buscarCondicion(h.condicionId);
    return !condicion || (!esSimboloCoronaCompleta(condicion) && !esSimboloRaizCompleta(condicion));
  });

  const hallazgosPorSuperficie: Partial<Record<Superficie, HallazgoDental[]>> = {};
  for (const h of hallazgos) {
    if (h.superficie) {
      (hallazgosPorSuperficie[h.superficie] ??= []).push(h);
    }
  }

  return (
    <div className={`${styles.diente} ${divisorIzquierda ? styles.divisor : ""}`}>
      <span className={styles.numero}>{numero}</span>
      <button
        type="button"
        className={`${styles.corona} ${dienteSeleccionado ? styles.seleccionado : ""}`}
        onClick={onClickDiente}
        aria-label={`Diente ${numero} completo`}
        aria-pressed={dienteSeleccionado}
      >
        <svg className={styles.coronaFondo} viewBox={CONTORNO_CORONA_VIEWBOX} aria-hidden="true">
          <path d={CONTORNO_CORONA} />
        </svg>
        {hallazgosCoronaCompleta.map((h, i) => (
          <SimboloHallazgo key={`${h.id}-${i}`} hallazgo={h} escala="completo" />
        ))}
        <span className={styles.iconosChicos}>
          {hallazgosIconoChico.map((h, i) => (
            <SimboloHallazgo key={`${h.id}-${i}`} hallazgo={h} />
          ))}
        </span>
      </button>
      <div className={styles.cruz}>
        {SUPERFICIES_CRUZ.map(({ superficie, clase }) => (
          <button
            key={superficie}
            type="button"
            className={`${styles.celda} ${styles[clase]} ${
              superficieSeleccionada === superficie ? styles.seleccionado : ""
            }`}
            onClick={() => onClickSuperficie(superficie)}
            aria-label={`Diente ${numero}, superficie ${superficie.toLowerCase().replace("_", "/")}`}
            aria-pressed={superficieSeleccionada === superficie}
          >
            {(hallazgosPorSuperficie[superficie] ?? []).map((h, i) => (
              <SimboloHallazgo key={`${h.id}-${i}`} hallazgo={h} />
            ))}
          </button>
        ))}
      </div>
      <div className={styles.raiz} aria-hidden="true">
        {hallazgosRaizCompleta.length > 0 && (
          <span className={styles.raizIconos}>
            {hallazgosRaizCompleta.map((h, i) => (
              <SimboloHallazgo key={`${h.id}-${i}`} hallazgo={h} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
