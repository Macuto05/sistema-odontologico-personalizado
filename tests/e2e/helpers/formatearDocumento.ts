/**
 * Réplica mínima de src/components/ui/documentoIdentidad.ts#formatearDocumentoIdentidad —
 * los tests e2e no importan código de `src/` (runtime de Playwright distinto al de la app),
 * así que se duplica esta función pura de 3 líneas en vez de resolver el alias `@/` acá.
 */
export function formatearDocumentoParaMostrar(documento: string): string {
  const prefijo = documento.charAt(0);
  const numero = documento.slice(1);
  const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${prefijo}-${conPuntos}`;
}
