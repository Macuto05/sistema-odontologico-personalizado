import { useId } from "react";
import styles from "./DocumentoIdentidadInput.module.css";
import { PrefijoDocumento, formatearNumeroDocumento } from "./documentoIdentidad";

interface DocumentoIdentidadInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  prefijo: PrefijoDocumento;
  numero: string;
  onChangePrefijo: (prefijo: PrefijoDocumento) => void;
  onChangeNumero: (numeroSinFormato: string) => void;
}

/**
 * Documento de identidad venezolano: selector V-/E- + número con puntos de miles mientras
 * se escribe (solo visual — lo que se guarda es el prefijo pegado al número sin puntos ni
 * guion, igual que los datos existentes, ver documentoIdentidad.ts).
 */
export function DocumentoIdentidadInput({
  label = "Documento de identidad",
  required,
  error,
  prefijo,
  numero,
  onChangePrefijo,
  onChangeNumero,
}: DocumentoIdentidadInputProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={`${styles.label} text-body-sm`}>
          {label}
          {required && <span className={styles.required}> (Requerido)</span>}
        </label>
      )}
      <div className={[styles.wrapper, error ? styles.wrapperError : ""].filter(Boolean).join(" ")}>
        <select
          className={styles.prefijo}
          aria-label="Tipo de documento"
          value={prefijo}
          onChange={(e) => onChangePrefijo(e.target.value as PrefijoDocumento)}
          // Ver nota en Input.tsx: extensiones del navegador inyectan atributos (ej.
          // fdprocessedid) antes de que React hidrate — falso positivo, no un bug real.
          suppressHydrationWarning
        >
          <option value="V">V-</option>
          <option value="E">E-</option>
        </select>
        <input
          id={id}
          className={styles.numero}
          inputMode="numeric"
          placeholder="12.345.678"
          value={formatearNumeroDocumento(numero)}
          onChange={(e) => onChangeNumero(e.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          suppressHydrationWarning
        />
      </div>
      {error && (
        <span id={`${id}-error`} role="alert" className={`${styles.error} text-caption`}>
          {error}
        </span>
      )}
    </div>
  );
}
