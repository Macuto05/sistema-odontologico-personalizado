import { InputHTMLAttributes, forwardRef, useId } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/** Casilla reutilizable — docs/design-system.md §6.2. Buscar acá antes de crear una nueva. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className, ...props },
  ref,
) {
  // Mismo criterio que Input/Select: el label siempre queda asociado, con o sin id/name explícito.
  const idGenerado = useId();
  const checkboxId = id ?? props.name ?? idGenerado;
  return (
    <label htmlFor={checkboxId} className={[styles.fila, className].filter(Boolean).join(" ")}>
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={styles.input}
        // Ver nota en Input.tsx: extensiones del navegador inyectan atributos (ej.
        // fdprocessedid) antes de que React hidrate — falso positivo, no un bug real.
        suppressHydrationWarning
        {...props}
      />
      <span className={`${styles.label} text-body-sm`}>{label}</span>
    </label>
  );
});
