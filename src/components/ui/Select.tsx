import { SelectHTMLAttributes, forwardRef, useId } from "react";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/** Select reutilizable — mismo lenguaje visual que Input (docs/design-system.md §6.2). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helperText, id, className, children, ...props },
  ref,
) {
  // Mismo criterio que Input: el label siempre queda asociado, con o sin id/name explícito.
  const idGenerado = useId();
  const selectId = id ?? props.name ?? idGenerado;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={selectId} className={`${styles.label} text-body-sm`}>
          {label}
          {props.required && <span className={styles.required}> (Requerido)</span>}
        </label>
      )}
      <div className={styles.wrapper}>
        <select
          ref={ref}
          id={selectId}
          className={[styles.select, error ? styles.selectError : "", className]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          // Ver nota en Input.tsx: extensiones del navegador inyectan atributos (ej.
          // fdprocessedid) antes de que React hidrate — falso positivo, no un bug real.
          suppressHydrationWarning
          {...props}
        >
          {children}
        </select>
        <span className={styles.flecha} aria-hidden="true">
          <IconoFlecha />
        </span>
      </div>
      {error && (
        <span id={`${selectId}-error`} role="alert" className={`${styles.error} text-caption`}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className={`${styles.helper} text-caption`}>{helperText}</span>
      )}
    </div>
  );
});

function IconoFlecha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
