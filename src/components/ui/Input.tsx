import { InputHTMLAttributes, ReactNode, forwardRef, useId } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Ícono decorativo a la izquierda (ej. lupa de búsqueda) — docs/design-system.md §6.2. */
  iconoIzquierdo?: ReactNode;
}

/** Input reutilizable — docs/design-system.md §6.2. Buscar acá antes de crear uno nuevo. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, iconoIzquierdo, id, className, ...props },
  ref,
) {
  // Se genera un id propio si el consumidor no pasó id/name — el label SIEMPRE debe
  // quedar asociado al input (accesibilidad), sin depender de que no se olviden de pasarlo.
  const idGenerado = useId();
  const inputId = id ?? props.name ?? idGenerado;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={`${styles.label} text-body-sm`}>
          {label}
          {props.required && <span className={styles.required}> (Requerido)</span>}
        </label>
      )}
      <div className={styles.wrapper}>
        {iconoIzquierdo && (
          <span className={styles.iconoIzquierdo} aria-hidden="true">
            {iconoIzquierdo}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            styles.input,
            iconoIzquierdo ? styles.conIcono : "",
            error ? styles.inputError : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          // Algunas extensiones del navegador (autocompletado de formularios) inyectan
          // atributos como fdprocessedid antes de que React hidrate — falso positivo de
          // mismatch, no un bug de la app.
          suppressHydrationWarning
          {...props}
        />
      </div>
      {error && (
        <span id={`${inputId}-error`} role="alert" className={`${styles.error} text-caption`}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className={`${styles.helper} text-caption`}>{helperText}</span>
      )}
    </div>
  );
});
