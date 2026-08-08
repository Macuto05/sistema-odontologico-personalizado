/**
 * Progreso del ciclo de sync en curso — 011-indicador-sincronizacion, research.md #4.
 *
 * Deliberadamente efímero (en memoria, no en Dexie): si se recarga la página a mitad de un
 * ciclo, el progreso se pierde y el siguiente ciclo lo recalcula. Persistirlo agregaría una
 * tabla y un bump de esquema para un dato que deja de ser válido apenas cambia la conexión
 * (Principio V).
 *
 * Mismo patrón de store que `useTema` (src/hooks/useTema.ts): estado a nivel de módulo +
 * `suscribir`/`obtener`, para consumirlo desde React con `useSyncExternalStore` sin agregar
 * un Context. `syncEngine.ts` es el único que escribe acá; la UI solo lee.
 */

export type FaseSync = "INACTIVO" | "PUSH" | "PULL";

export interface EstadoProgresoSync {
  fase: FaseSync;
  /** Operaciones pendientes en el outbox al iniciar el push. Solo significativo en `PUSH`. */
  total: number;
  /** Cuántas de esas ya se enviaron. Solo significativo en `PUSH`. */
  enviadas: number;
}

const INACTIVO: EstadoProgresoSync = { fase: "INACTIVO", total: 0, enviadas: 0 };

type Listener = () => void;
const listeners = new Set<Listener>();

// La referencia solo cambia cuando cambia el contenido: `useSyncExternalStore` compara por
// identidad, así que devolver un objeto nuevo en cada lectura provocaría un re-render por
// cada llamada (y un loop de "getSnapshot should be cached").
let progresoActual: EstadoProgresoSync = INACTIVO;

function notificar() {
  listeners.forEach((listener) => listener());
}

export function suscribirProgreso(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function obtenerProgreso(): EstadoProgresoSync {
  return progresoActual;
}

/** Snapshot para SSR — en el servidor nunca hay un ciclo de sync corriendo. */
export function obtenerProgresoServidor(): EstadoProgresoSync {
  return INACTIVO;
}

/** Empieza la fase de envío con el total de operaciones pendientes en el outbox. */
export function iniciarPush(total: number): void {
  progresoActual = { fase: "PUSH", total, enviadas: 0 };
  notificar();
}

/**
 * Suma operaciones ya enviadas al avance del push actual. Se topea en `total`: el push
 * reintenta operaciones que fallaron por red (`revertirAPendiente`), así que la suma de
 * enviadas de todos los lotes puede superar el total contado al inicio — sin este tope el
 * indicador mostraría más de 100%.
 */
export function marcarEnviadas(cantidad: number): void {
  if (progresoActual.fase !== "PUSH") return;
  const enviadas = Math.min(progresoActual.enviadas + cantidad, progresoActual.total);
  progresoActual = { ...progresoActual, enviadas };
  notificar();
}

/** Terminó el envío, empieza a traer del servidor: el ciclo sigue activo pero ya sin %. */
export function pasarAPull(): void {
  progresoActual = { fase: "PULL", total: 0, enviadas: 0 };
  notificar();
}

/** Fin del ciclo completo (o corte a mitad de camino) — vuelve a inactivo. */
export function finalizarCiclo(): void {
  progresoActual = INACTIVO;
  notificar();
}
