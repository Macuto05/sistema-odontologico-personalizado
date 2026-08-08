const PREFIJOS_VALIDOS = ["V", "E"] as const;

export type PrefijoDocumento = (typeof PREFIJOS_VALIDOS)[number];

/** Inserta puntos de miles: "29838893" → "29.838.893". Solo para mostrar, no para guardar. */
export function formatearNumeroDocumento(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Separa un `documentoIdentidad` guardado (ej. "V29838893", sin puntos ni guion — así están
 * los datos existentes) en prefijo + número, para poder editarlo con el selector V-/E-.
 * Si no reconoce el prefijo (dato legado sin V/E), asume "V" y trata todo como número.
 * `null` (paciente con representante, sin documento propio — 007-representante-menor)
 * arranca con los campos vacíos, igual que un alta nueva sin nada tipeado todavía.
 */
export function parsearDocumentoIdentidad(valor: string | null): { prefijo: PrefijoDocumento; numero: string } {
  if (!valor) return { prefijo: "V", numero: "" };
  const primera = valor.charAt(0).toUpperCase();
  if ((PREFIJOS_VALIDOS as readonly string[]).includes(primera)) {
    return { prefijo: primera as PrefijoDocumento, numero: valor.slice(1).replace(/\D/g, "") };
  }
  return { prefijo: "V", numero: valor.replace(/\D/g, "") };
}

/** Reconstruye el valor a guardar — mismo formato que los datos existentes: sin puntos ni guion.
 * Número vacío (paciente con representante, sin documento propio) se guarda como `null`. */
export function combinarDocumentoIdentidad(prefijo: PrefijoDocumento, numero: string): string | null {
  return numero ? `${prefijo}${numero}` : null;
}

/** Solo para mostrar en modo lectura (ficha) — ej. "V29838893" → "V-29.838.893". `null` es
 * "sin documento propio" (paciente con representante). */
export function formatearDocumentoIdentidad(valor: string | null): string {
  if (!valor) return "—";
  const { prefijo, numero } = parsearDocumentoIdentidad(valor);
  return `${prefijo}-${formatearNumeroDocumento(numero)}`;
}
