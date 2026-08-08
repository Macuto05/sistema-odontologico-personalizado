"use client";

import { HallazgoDental, Superficie } from "@/domain/entities/Odontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { DienteSvg } from "./DienteSvg";
import { LineaMultiDiente, ANCHO_COLUMNA } from "./LineaMultiDiente";
import { colorDeHallazgo } from "./simboloUtils";
import styles from "./DiagramaBoca.module.css";

export interface SeleccionDiente {
  diente: string;
  superficie: Superficie | null;
}

interface DiagramaBocaProps {
  dientesSuperior: string[];
  dientesInferior: string[];
  hallazgos: HallazgoDental[];
  seleccion: SeleccionDiente | null;
  onClickDiente: (diente: string) => void;
  onClickSuperficie: (diente: string, superficie: Superficie) => void;
}

function esTramo(hallazgo: HallazgoDental): boolean {
  const condicion = buscarCondicion(hallazgo.condicionId);
  return condicion?.estiloMultiDiente === "TRAMO";
}

/** Arcada superior e inferior — un DienteSvg por número de la dentición activa (FR-001,
 * FR-002). */
export function DiagramaBoca({
  dientesSuperior,
  dientesInferior,
  hallazgos,
  seleccion,
  onClickDiente,
  onClickSuperficie,
}: DiagramaBocaProps) {
  const hallazgosTramo = hallazgos.filter(esTramo);

  function hallazgosDelDiente(numero: string) {
    // Los hallazgos "TRAMO" se dibujan una sola vez vía el overlay de LineaMultiDiente,
    // no como ícono repetido en cada diente que tocan.
    return hallazgos.filter((h) => h.dientes.includes(numero) && !esTramo(h));
  }

  function renderDiente(numero: string, indice: number, arcada: string[]) {
    const seleccionado = seleccion?.diente === numero;
    return (
      <DienteSvg
        key={numero}
        numero={numero}
        hallazgos={hallazgosDelDiente(numero)}
        dienteSeleccionado={seleccionado && seleccion?.superficie === null}
        superficieSeleccionada={seleccionado ? (seleccion?.superficie ?? null) : null}
        onClickDiente={() => onClickDiente(numero)}
        onClickSuperficie={(superficie) => onClickSuperficie(numero, superficie)}
        divisorIzquierda={indice === arcada.length / 2}
      />
    );
  }

  function renderArcada(dientes: string[]) {
    const tramosArcada = hallazgosTramo.filter((h) => h.dientes.every((d) => dientes.includes(d)));
    const anchoSvg = dientes.length * ANCHO_COLUMNA - 5;
    return (
      // Envoltorio propio (ancho natural, no estirado) para que el overlay absoluto —
      // anclado a este contenedor, no a `.arcada` — comparta el mismo origen de
      // coordenadas que los dientes incluso cuando `.arcada` los centra con espacio
      // sobrante a los costados (si el overlay quedara anclado a `.arcada` se desalinearía
      // de los dientes reales apenas hubiera espacio de sobra).
      <div className={styles.fila}>
        {dientes.map((numero, indice) => renderDiente(numero, indice, dientes))}
        {tramosArcada.length > 0 && (
          <svg
            className={styles.overlay}
            viewBox={`0 0 ${anchoSvg} 50`}
            width={anchoSvg}
            height={50}
            aria-hidden="true"
          >
            {tramosArcada.map((h) => {
              const condicion = buscarCondicion(h.condicionId);
              if (!condicion || condicion.simbolo.tipo !== "GRAFICO") return null;
              return (
                <LineaMultiDiente
                  key={h.id}
                  hallazgo={h}
                  dientesArcada={dientes}
                  variante={condicion.simbolo.variante}
                  color={colorDeHallazgo(condicion, h)}
                />
              );
            })}
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={styles.diagrama}>
      <div className={styles.arcada}>{renderArcada(dientesSuperior)}</div>
      <div className={`${styles.arcada} ${styles.inferior}`}>{renderArcada(dientesInferior)}</div>
    </div>
  );
}
