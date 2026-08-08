import { ReactNode, useEffect, useRef } from "react";
import styles from "./Drawer.module.css";

interface DrawerProps {
  abierto: boolean;
  titulo: string;
  /** Línea de contexto opcional debajo del título (ej. fecha/hora · tipo de cita) — solo la
   * cabecera crece para acomodarla, `.content` no cambia. */
  subtitulo?: ReactNode;
  /** Tiñe la cabecera con `--color-primary-bg` en vez de blanco plano — pensado para
   * detalles de un registro puntual (ej. "Detalle de la cita") donde el color ayuda a leer
   * la cabecera como una franja de contexto, no como una fila de acciones más. Por defecto
   * `false`: los usos existentes (ej. `HistorialDrawer`, Antecedentes) no cambian. */
  acento?: boolean;
  onCerrar: () => void;
  children: ReactNode;
}

/**
 * Panel deslizable desde el borde derecho — docs/design-system.md §6.17. Mismo manejo de
 * overlay/Escape/foco que `Modal`, pero anclado a la derecha en vez de centrado: para
 * contenido de consulta rápida (ej. Historial de citas) que no debe interrumpir el flujo
 * principal como un diálogo modal centrado sí lo hace. Pantalla completa por debajo de
 * 640px, igual que `Modal` (§4.0).
 */
export function Drawer({ abierto, titulo, subtitulo, acento, onCerrar, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={acento ? `${styles.header} ${styles.headerAcento}` : styles.header}>
          <div className={styles.headerFila}>
            <h2 id="drawer-titulo" className="text-heading">
              {titulo}
            </h2>
            <button
              type="button"
              className={acento ? `${styles.cerrar} ${styles.cerrarAcento}` : styles.cerrar}
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              <IconoCerrar />
            </button>
          </div>
          {subtitulo && <div className={styles.subtitulo}>{subtitulo}</div>}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function IconoCerrar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
