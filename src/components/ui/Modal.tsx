import { ReactNode, useEffect, useRef } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  tamano?: "sm" | "default";
  /** Ícono "×" explícito en el encabezado, además de Escape/clic afuera — útil cuando el
   * modal no tiene un botón "Cancelar" propio en el footer (ej. paneles informativos sin
   * acción a confirmar). Oculto por defecto para no duplicar afordancias en los modales de
   * confirmación que ya tienen "Cancelar". */
  mostrarBotonCerrar?: boolean;
}

/**
 * Modal/Dialog reutilizable — docs/design-system.md §6.4. Pantalla completa por debajo de
 * 640px, centrado con ancho máximo a partir de ahí (§4.0).
 */
export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  tamano = "sm",
  mostrarBotonCerrar = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${tamano === "sm" ? styles.sm : styles.default}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="modal-titulo" className="text-heading">
            {titulo}
          </h2>
          {mostrarBotonCerrar && (
            <button
              type="button"
              className={styles.cerrar}
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              <IconoCerrar />
            </button>
          )}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}

function IconoCerrar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
