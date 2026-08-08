"use client";

import { ReactNode, useState } from "react";
import styles from "./Accordion.module.css";

export interface AccordionSeccion {
  id: string;
  titulo: string;
  contenido: ReactNode;
}

interface AccordionProps {
  secciones: AccordionSeccion[];
  /** ids abiertos por defecto. */
  abiertosPorDefecto?: string[];
  /** "multiple" (default): cada sección se abre/cierra de forma independiente. "unica":
   * abrir una sección colapsa la que estuviera abierta (ej. panel de herramientas del
   * Odontograma, donde solo tiene sentido tener una categoría de condiciones a la vez). */
  modo?: "multiple" | "unica";
}

/**
 * Acordeón reutilizable — docs/design-system.md §6.13 (005-atencion-paciente). Por
 * defecto cada sección se abre/cierra de forma independiente (no exclusiva) — el panel de
 * Atención lo usa para "Antecedentes" e "Historial de citas anteriores", que se pueden
 * consultar por separado sin perder el estado del otro.
 */
export function Accordion({ secciones, abiertosPorDefecto = [], modo = "multiple" }: AccordionProps) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set(abiertosPorDefecto));

  function alternar(id: string) {
    setAbiertos((prev) => {
      if (modo === "unica") {
        return prev.has(id) ? new Set() : new Set([id]);
      }
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  return (
    <div className={styles.contenedor}>
      {secciones.map((seccion) => {
        const abierto = abiertos.has(seccion.id);
        return (
          <div key={seccion.id} className={styles.seccion}>
            <button
              type="button"
              className={styles.encabezado}
              aria-expanded={abierto}
              aria-controls={`accordion-panel-${seccion.id}`}
              onClick={() => alternar(seccion.id)}
            >
              <span className="text-body-sm">{seccion.titulo}</span>
              <span
                className={`${styles.flecha} ${abierto ? styles.flechaAbierta : ""}`}
                aria-hidden="true"
              >
                <IconoFlecha />
              </span>
            </button>
            {abierto && (
              <div id={`accordion-panel-${seccion.id}`} className={styles.panel}>
                {seccion.contenido}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IconoFlecha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
