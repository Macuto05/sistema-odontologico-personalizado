"use client";

import { KeyboardEvent, useId, useRef, useState } from "react";
import styles from "./EditorEtiquetas.module.css";

interface EditorEtiquetasProps {
  label?: string;
  valores: string[];
  onChange: (valores: string[]) => void;
  placeholder?: string;
}

/**
 * Editor de etiquetas independientes — docs/design-system.md §6.2.1. Reemplaza los
 * `Textarea` de texto libre de la historia clínica (antecedentes heredofamiliares,
 * medicamentos actuales, alergias, "Otros" de antecedentes patológicos): cada dato se
 * guarda como un elemento de una lista, no como una oración — a pedido explícito de la
 * odontóloga, para poder mostrarlos después como etiquetas sueltas en vez de párrafos
 * (008-rediseno-visual-sistema). Botón "＋ Añadir" abre un campo de texto in situ; Enter
 * confirma la etiqueta y deja el campo abierto para seguir agregando; Escape o perder el
 * foco sin texto lo cierra.
 */
export function EditorEtiquetas({ label, valores, onChange, placeholder }: EditorEtiquetasProps) {
  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function confirmar() {
    const limpio = texto.trim();
    if (limpio !== "") {
      onChange([...valores, limpio]);
    }
    setTexto("");
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmar();
    } else if (e.key === "Escape") {
      setTexto("");
      setAgregando(false);
    }
  }

  function quitar(indice: number) {
    onChange(valores.filter((_, i) => i !== indice));
  }

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={`${styles.label} text-body-sm`}>
          {label}
        </label>
      )}
      <div className={styles.contenedor}>
        {valores.map((valor, indice) => (
          <span key={`${valor}-${indice}`} className={styles.etiqueta}>
            {valor}
            <button
              type="button"
              className={styles.quitar}
              onClick={() => quitar(indice)}
              aria-label={`Quitar ${valor}`}
            >
              <IconoX />
            </button>
          </span>
        ))}
        {agregando ? (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoFocus
            className={styles.input}
            value={texto}
            placeholder={placeholder}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              confirmar();
              setAgregando(false);
            }}
          />
        ) : (
          <button
            type="button"
            className={styles.agregar}
            onClick={() => setAgregando(true)}
            aria-label={label ? `Añadir a ${label}` : "Añadir"}
          >
            <IconoMas />
            Añadir
          </button>
        )}
      </div>
    </div>
  );
}

function IconoMas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconoX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
