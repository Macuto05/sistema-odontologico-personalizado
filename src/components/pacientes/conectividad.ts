/**
 * `navigator.onLine` no es confiable para decidir esto: puede reportar `true` aunque no
 * haya conexión real — comprobado en pruebas e2e, una página cargada mientras ya está
 * offline no actualiza `navigator.onLine` hasta que un request de verdad falla (y MDN
 * advierte lo mismo para navegadores/SO reales). Se hace una prueba corta y real contra
 * el propio servidor en vez de confiar en ese flag.
 */
export async function hayConexionReal(timeoutMs = 1500): Promise<boolean> {
  try {
    const controlador = new AbortController();
    const timeoutId = setTimeout(() => controlador.abort(), timeoutMs);
    await fetch("/api/patients?limite=1", { signal: controlador.signal, cache: "no-store" });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
