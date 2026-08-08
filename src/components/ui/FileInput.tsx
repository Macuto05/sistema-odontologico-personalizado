"use client";

import { ChangeEvent, useId, useState } from "react";
import styles from "./FileInput.module.css";

interface FileInputProps {
  label: string;
  onSeleccionar: (archivo: File) => void;
  disabled?: boolean;
  helperText?: string;
}

const PREFIJOS_ACEPTADOS = ["image/", "application/pdf"];

function tipoAceptado(tipo: string): boolean {
  return PREFIJOS_ACEPTADOS.some((prefijo) => tipo.startsWith(prefijo));
}

/**
 * Selector de archivo (imagen o PDF) — docs/design-system.md §6.14. Botón personalizado
 * (mismos tokens que `Button` variante primary) en vez del control nativo del navegador
 * ("Choose File / No file chosen"), que se veía genérico y no encajaba con el resto del
 * sistema (feedback directo de la odontóloga). El `<input>` real sigue existiendo, oculto
 * pero enfocable por teclado (`sr-only`, no `display:none`) — el `<label htmlFor>` que
 * hace de botón lo activa sin necesitar JS. No se indica "imagen o PDF" en el texto
 * visible: el filtro (`accept`) y la validación ya lo garantizan, no hace falta
 * repetirlo. Valida el tipo en el cliente antes de intentar subir (FR-018); el servidor
 * vuelve a validarlo igual (defensa en profundidad, nunca solo del lado cliente).
 */
export function FileInput({ label, onSeleccionar, disabled, helperText }: FileInputProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error o de un éxito.
    e.target.value = "";
    if (!archivo) return;
    if (!tipoAceptado(archivo.type)) {
      setError("Solo se aceptan imágenes o archivos PDF.");
      return;
    }
    setError(null);
    onSeleccionar(archivo);
  }

  return (
    <div className={styles.campo}>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        onChange={onChange}
        disabled={disabled}
        className={styles.inputOculto}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`${styles.boton} ${disabled ? styles.botonDeshabilitado : ""}`}
      >
        <IconoSubir />
        {label}
      </label>
      {error && (
        <span id={`${id}-error`} role="alert" className={`${styles.error} text-caption`}>
          {error}
        </span>
      )}
      {!error && helperText && <span className={`${styles.helper} text-caption`}>{helperText}</span>}
    </div>
  );
}

function IconoSubir() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
