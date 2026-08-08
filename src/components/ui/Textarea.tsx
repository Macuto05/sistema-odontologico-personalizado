import { TextareaHTMLAttributes, forwardRef, useId } from "react";
import styles from "./Textarea.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/** Textarea reutilizable — variante multilínea de Input (docs/design-system.md §6.2). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, id, className, ...props },
  ref,
) {
  // Mismo criterio que Input: el label siempre queda asociado, con o sin id/name explícito.
  const idGenerado = useId();
  const textareaId = id ?? props.name ?? idGenerado;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={textareaId} className={`${styles.label} text-body-sm`}>
          {label}
          {props.required && <span className={styles.required}> (Requerido)</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={[styles.textarea, error ? styles.textareaError : "", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        // Ver nota en Input.tsx: extensiones del navegador inyectan atributos (ej.
        // fdprocessedid) antes de que React hidrate — falso positivo, no un bug real.
        suppressHydrationWarning
        {...props}
      />
      {error && (
        <span id={`${textareaId}-error`} role="alert" className={`${styles.error} text-caption`}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className={`${styles.helper} text-caption`}>{helperText}</span>
      )}
    </div>
  );
});
