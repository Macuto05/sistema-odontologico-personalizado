"use client";

import { Modal } from "@/components/ui/Modal";
import { Accordion, AccordionSeccion } from "@/components/ui/Accordion";
import { CATALOGO_ODONTOGRAMA, CATEGORIAS_CONDICION } from "@/domain/entities/CondicionOdontograma";
import { SimboloCondicionPreview } from "./simboloUtils";
import styles from "./LeyendaOdontograma.module.css";

interface LeyendaOdontogramaProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Leyenda de referencia del catálogo completo (US6, FR-011) — accesible desde el panel de
 * herramientas. Lista las 44 condiciones agrupadas en las mismas 8 categorías del catálogo.
 */
export function LeyendaOdontograma({ abierto, onCerrar }: LeyendaOdontogramaProps) {
  const secciones: AccordionSeccion[] = CATEGORIAS_CONDICION.map((categoria) => ({
    id: categoria.id,
    titulo: categoria.nombre,
    contenido: (
      <ul className={styles.lista}>
        {CATALOGO_ODONTOGRAMA.filter((c) => c.categoria === categoria.id).map((c) => (
          <li key={c.id} className={styles.item}>
            <SimboloCondicionPreview condicion={c} />
            <span className="text-body-sm">{c.nombre}</span>
          </li>
        ))}
      </ul>
    ),
  }));

  return (
    <Modal abierto={abierto} titulo="Leyenda de símbolos" onCerrar={onCerrar} tamano="default">
      <Accordion secciones={secciones} />
    </Modal>
  );
}
