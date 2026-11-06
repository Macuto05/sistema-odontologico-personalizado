import { v4 as uuid } from "uuid";
import {
  db,
  CLAVE_ULTIMA_SINCRONIZACION,
  CLAVE_ULTIMA_SINCRONIZACION_CITAS,
  CLAVE_ULTIMA_SINCRONIZACION_ODONTOGRAMAS,
  CLAVE_ULTIMA_SINCRONIZACION_CAMBIOS_ODONTOGRAMA,
  CLAVE_ULTIMA_SINCRONIZACION_PLAN_TRATAMIENTO,
  CLAVE_ULTIMA_SINCRONIZACION_INSUMOS,
  CLAVE_ULTIMA_SINCRONIZACION_GENERAL,
} from "../db/dexie/db";
import {
  contarOperacionesPendientes,
  encolarOperacion,
  hayOperacionesPendientes,
  marcarConflicto,
  marcarEnviando,
  marcarSincronizadaYLimpiar,
  ANTIGUEDAD_ENVIO_HUERFANO_MS,
  obtenerLotePendiente,
  recuperarEnviosHuerfanos,
  revertirAPendiente,
} from "./outboxQueue";
import { finalizarCiclo, iniciarPush, marcarEnviadas, pasarAPull } from "./syncStatus";
import { Paciente } from "@/domain/entities/Paciente";
import { Consultorio } from "@/domain/entities/Consultorio";
import { Cita } from "@/domain/entities/Cita";
import { Odontograma } from "@/domain/entities/Odontograma";
import { fusionarContenidoDuplicado } from "@/domain/entities/fusionOdontograma";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import { Insumo } from "@/domain/entities/Insumo";

/** Tamaño de lote del pull de Paciente — no confundir con el de la pantalla (10). research.md #12. */
const LOTE_PULL = 200;

const INTERVALO_REINTENTO_MS = 30_000;

/** Tope del POST de sync. Sin él, un request colgado (red móvil que se cae sin cerrar la
 * conexión) dejaba `cicloEnCurso` en true para siempre y el motor no volvía a sincronizar
 * hasta recargar. Menor que `ANTIGUEDAD_ENVIO_HUERFANO_MS` (outboxQueue.ts). */
const TIMEOUT_PUSH_MS = 60_000;

interface ResultadoSyncApi {
  id: string;
  estado: "SINCRONIZADO" | "CONFLICTO" | "RECHAZADO";
  paciente?: Paciente;
  consultorio?: Consultorio;
  consultorioEliminadoId?: string;
  cita?: Cita;
  odontograma?: Odontograma;
  cambioOdontograma?: CambioOdontograma;
  itemPlanTratamiento?: ItemPlanTratamiento;
  insumo?: Insumo;
  error?: string;
}

/**
 * Envía el lote pendiente al servidor y aplica los resultados — contracts/sync-api.md,
 * contracts/consultorios-api.md. El lote puede mezclar operaciones de Paciente y de
 * Consultorio (004-consultorios, research.md #1); esta función no distingue entre ellas,
 * solo reenvía `entidad`/`entidadId` y aplica lo que la respuesta traiga.
 *
 * Devuelve cuántas operaciones dejaron de estar pendientes en este lote — sincronizadas o en
 * conflicto, ambas salen de la cola (011-indicador-sincronizacion). Un lote que falla por red
 * devuelve 0: sus operaciones vuelven a `PENDIENTE` y se reintentan, así que no son progreso.
 */
export async function sincronizarLote(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  const lote = await obtenerLotePendiente(20);
  if (lote.length === 0) return 0;

  const ids = lote.map((op) => op.id);
  await marcarEnviando(ids);

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_PUSH_MS);
  try {
    const respuesta = await fetch("/api/sync", {
      method: "POST",
      signal: control.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operaciones: lote.map((op) => ({
          id: op.id,
          entidad: op.entidad,
          entidadId: op.entidadId,
          tipo: op.tipo,
          payload: op.payload,
          ...(op.baseVersion !== undefined ? { baseVersion: op.baseVersion } : {}),
        })),
      }),
    });

    if (!respuesta.ok) {
      await revertirAPendiente(ids);
      return 0;
    }

    const { resultados }: { resultados: ResultadoSyncApi[] } = await respuesta.json();

    // Los Odontogramas se guardan DESPUÉS de marcar el estado de todas las operaciones del
    // lote: si uno resulta ser el del servidor para un duplicado local, la reconciliación
    // reasigna/descarta operaciones de ese duplicado que pueden venir en este mismo lote —
    // hacerlo antes dejaría que el `marcarConflicto` de abajo las volviera a pisar.
    const odontogramasRecibidos: Odontograma[] = [];

    for (const resultado of resultados) {
      if (resultado.paciente) await db.pacientes.put(resultado.paciente);
      if (resultado.consultorio) await db.consultorios.put(resultado.consultorio);
      if (resultado.consultorioEliminadoId) await db.consultorios.delete(resultado.consultorioEliminadoId);
      if (resultado.cita) await db.citas.put(resultado.cita);
      if (resultado.odontograma) odontogramasRecibidos.push(resultado.odontograma);
      if (resultado.cambioOdontograma) {
        await db.cambiosOdontograma.put(resultado.cambioOdontograma);
      }
      if (resultado.itemPlanTratamiento) {
        await db.itemsPlanTratamiento.put(resultado.itemPlanTratamiento);
      }
      if (resultado.insumo) await db.insumos.put(resultado.insumo);

      if (resultado.estado === "SINCRONIZADO") {
        await marcarSincronizadaYLimpiar(resultado.id);
      } else {
        // CONFLICTO o RECHAZADO (ej. DOCUMENTO_DUPLICADO, NOMBRE_DUPLICADO): nunca se
        // descarta la operación silenciosamente (Principio III) — se refleja el estado
        // del servidor y se marca para revisión.
        await marcarConflicto(resultado.id);
      }
    }

    for (const odontograma of odontogramasRecibidos) await guardarOdontogramaRemoto(odontograma);

    return resultados.length;
  } catch {
    // Sin conexión, timeout o error de red a mitad de camino — se reintenta en el próximo ciclo.
    await revertirAPendiente(ids);
    return 0;
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Aplica una página de pacientes remotos al espejo local. No pisa una edición local que
 * todavía tiene una operación pendiente en el outbox (para no perder un cambio que este
 * mismo dispositivo hizo y aún no envió).
 */
async function aplicarPaginaRemota(pacientes: Paciente[]): Promise<void> {
  for (const remoto of pacientes) {
    const local = await db.pacientes.get(remoto.id);
    if (!local) {
      await db.pacientes.put(remoto);
      continue;
    }

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(remoto.id)
      .and((op) => op.entidad === "PACIENTE")
      .count();
    if (tienePendiente > 0) continue;

    if (remoto.version > local.version) {
      await db.pacientes.put(remoto);
    }
  }
}

/**
 * Pull: trae el estado autoritativo del servidor y lo mezcla en Dexie local. Sin esto, un
 * paciente creado/editado en otro dispositivo nunca aparecería acá — el push por sí solo
 * solo cubre la mitad del problema (gap detectado durante la implementación, confirmado
 * con el usuario).
 *
 * Incremental (research.md #12 de 003-historia-clinica-paciente): en vez de pedir siempre
 * toda la tabla, se guarda la fecha de la última sincronización y se pide solo lo que
 * cambió desde entonces (`desde`) — así la carga contra la base no crece con la cantidad
 * total de pacientes. La primera sincronización de un dispositivo nuevo (sin fecha
 * guardada todavía) sí necesita traer todo el historial una vez, pero lo hace en lotes
 * (`LOTE_PULL`), no en una sola respuesta gigante.
 *
 * Nota (004-consultorios, research.md #6): si el consultorio de un paciente se elimina en
 * otro dispositivo, Postgres anula `consultorioId` vía `onDelete: SetNull` — una operación
 * a nivel de base de datos, no un `UPDATE` de Prisma, así que **no** actualiza
 * `Paciente.updatedAt`. Ese paciente puede no volver a traerse acá hasta su próxima
 * edición real; por eso `pullConsultoriosDesdeServidor` (abajo) aplica la misma anulación
 * directamente, sin depender de este pull incremental.
 */
export async function pullCambiosDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION);
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({
      estado: "TODOS",
      pagina: String(pagina),
      limite: String(LOTE_PULL),
    });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/patients?${params}`);
    } catch {
      return; // sin conexión a mitad de camino — se reintenta en el próximo ciclo
    }
    if (!respuesta.ok) return;

    const { pacientes }: { pacientes: Paciente[] } = await respuesta.json();
    await aplicarPaginaRemota(pacientes);

    if (pacientes.length < LOTE_PULL) break; // última página, no hay más
    pagina += 1;
  }

  // Se guarda el timestamp de *antes* de empezar a traer, no el de ahora: cualquier
  // cambio que haya ocurrido en el servidor mientras se traía esta página se vuelve a
  // pedir en el próximo ciclo (idempotente, put() es un upsert) en vez de perderse.
  await db.metaSync.put({ clave: CLAVE_ULTIMA_SINCRONIZACION, valor: inicioDeEsteCiclo });
}

/**
 * Pull de Consultorio (004-consultorios, research.md #5): trae siempre la lista completa
 * (no incremental — el volumen esperado es de unidades, no vale la pena la complejidad de
 * un esquema incremental que además tendría que representar borrados). Reconcilia: upsert
 * de lo vigente, y borrado local de cualquier consultorio que ya no esté en el servidor —
 * aplicando la misma anulación en cascada de `Paciente.consultorioId` que
 * `ConsultorioRepositoryDexie.eliminar` (research.md #6), sin la cual esta pantalla nunca
 * se enteraría de un borrado hecho en otro dispositivo.
 *
 * No borra un consultorio local que todavía tiene una operación pendiente en el outbox
 * (recién creado en este mismo dispositivo, aún no sincronizado) — mismo criterio que
 * `aplicarPaginaRemota` para Paciente, para no deshacer una creación propia.
 */
export async function pullConsultoriosDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/consultorios");
  } catch {
    return;
  }
  if (!respuesta.ok) return;

  const { consultorios: remotos }: { consultorios: Consultorio[] } = await respuesta.json();
  const idsRemotos = new Set(remotos.map((c) => c.id));

  for (const remoto of remotos) {
    await db.consultorios.put(remoto);
  }

  const locales = await db.consultorios.toArray();
  for (const local of locales) {
    if (idsRemotos.has(local.id)) continue;

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(local.id)
      .and((op) => op.entidad === "CONSULTORIO")
      .count();
    if (tienePendiente > 0) continue;

    await db.pacientes.filter((p) => p.consultorioId === local.id).modify({ consultorioId: null });
    await db.consultorios.delete(local.id);
  }
}

/**
 * Aplica una página de citas remotas al espejo local — mismo criterio que
 * `aplicarPaginaRemota` de Paciente: no pisa una edición local que todavía tiene una
 * operación pendiente en el outbox (research.md #7).
 */
async function aplicarPaginaRemotaCitas(citas: Cita[]): Promise<void> {
  for (const remota of citas) {
    const local = await db.citas.get(remota.id);
    if (!local) {
      await db.citas.put(remota);
      continue;
    }

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(remota.id)
      .and((op) => op.entidad === "CITA")
      .count();
    if (tienePendiente > 0) continue;

    if (remota.version > local.version) {
      await db.citas.put(remota);
    }
  }
}

/**
 * Pull incremental global de Cita (research.md #13) — mismo patrón de paginación +
 * watermark que `pullCambiosDesdeServidor` (Paciente), watermark propio
 * (`CLAVE_ULTIMA_SINCRONIZACION_CITAS`) porque son ciclos de paginación independientes.
 */
export async function pullCitasDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_CITAS);
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LOTE_PULL) });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/citas?${params}`);
    } catch {
      return; // sin conexión a mitad de camino — se reintenta en el próximo ciclo
    }
    if (!respuesta.ok) return;

    const { citas }: { citas: Cita[] } = await respuesta.json();
    await aplicarPaginaRemotaCitas(citas);

    if (citas.length < LOTE_PULL) break;
    pagina += 1;
  }

  await db.metaSync.put({ clave: CLAVE_ULTIMA_SINCRONIZACION_CITAS, valor: inicioDeEsteCiclo });
}

/**
 * Guarda en el espejo local un Odontograma que vino del servidor, reconciliándolo si este
 * dispositivo tiene un DUPLICADO: otro Odontograma con el mismo paciente + dentición pero
 * distinto id. Ese duplicado aparece cuando se abre un odontograma antes de que el pull
 * haya traído el del servidor — `obtenerOCrear` no lo encuentra localmente y crea uno vacío
 * con id nuevo. Antes de esto, `put(remoto)` violaba el índice único
 * `&[pacienteId+denticion]` (DexieError): el lote entero volvía a PENDIENTE y se reenviaba
 * para siempre ("Sincronizando…" sin fin, nada más subía desde ese dispositivo) y el
 * odontograma real del servidor nunca se veía en él.
 *
 * Reconciliación (en una sola transacción): el del servidor reemplaza al duplicado; si el
 * duplicado tenía hallazgos/notas marcados en este dispositivo, se fusionan con los del
 * servidor (`fusionarContenidoDuplicado` — no se pierde nada) y se encola un EDITAR sobre el
 * id real para subirlos; las operaciones del duplicado se descartan (su contenido ya está en
 * la fusión) y su historial de cambios se reasigna al id real.
 */
export async function guardarOdontogramaRemoto(remoto: Odontograma): Promise<void> {
  await db.transaction("rw", [db.odontogramas, db.outboxOperations, db.cambiosOdontograma], async () => {
    const duplicado = await db.odontogramas
      .where("[pacienteId+denticion]")
      .equals([remoto.pacienteId, remoto.denticion])
      .first();
    if (!duplicado || duplicado.id === remoto.id) {
      await db.odontogramas.put(remoto);
      return;
    }

    const opsDuplicado = await db.outboxOperations
      .where("entidadId")
      .equals(duplicado.id)
      .and((op) => op.entidad === "ODONTOGRAMA")
      .primaryKeys();
    await db.outboxOperations.bulkDelete(opsDuplicado);
    await db.odontogramas.delete(duplicado.id);

    const teniaContenido = duplicado.hallazgos.length > 0 || duplicado.notas.length > 0;
    if (!teniaContenido) {
      await db.odontogramas.put(remoto);
    } else {
      const fusion = fusionarContenidoDuplicado(remoto, duplicado);
      const fusionado: Odontograma = {
        ...remoto,
        ...fusion,
        version: remoto.version + 1,
        updatedAt: new Date().toISOString(),
      };
      await db.odontogramas.put(fusionado);
      await encolarOperacion("ODONTOGRAMA", remoto.id, "EDITAR", fusionado, remoto.version);
    }

    // Historial: los cambios registrados contra el duplicado pasan al id real, y las
    // operaciones de CambioOdontograma que todavía no subieron (o que el servidor rechazó
    // por apuntar a un odontograma inexistente) se reencolan con el id corregido. Con un id
    // de operación NUEVO: el servidor guarda el resultado de cada id de operación
    // (OperacionSincronizada, idempotencia) y a un reintento con el mismo id le devuelve el
    // rechazo ya guardado sin volver a mirarlo.
    await db.cambiosOdontograma
      .where("odontogramaId")
      .equals(duplicado.id)
      .modify({ odontogramaId: remoto.id });
    const opsCambios = await db.outboxOperations
      .filter(
        (op) =>
          op.entidad === "CAMBIO_ODONTOGRAMA" &&
          (op.payload as { odontogramaId?: string } | null)?.odontogramaId === duplicado.id,
      )
      .toArray();
    await db.outboxOperations.bulkDelete(opsCambios.map((op) => op.id));
    await db.outboxOperations.bulkAdd(
      opsCambios.map((op) => ({
        ...op,
        id: uuid(),
        payload: { ...(op.payload as object), odontogramaId: remoto.id },
        estado: "PENDIENTE" as const,
      })),
    );
  });
}

/** Trae del servidor los Odontogramas de UN paciente y los aplica con el mismo criterio que
 * el pull global — usado al abrir un odontograma con conexión, ANTES de crear uno vacío,
 * para no fabricar un duplicado de uno que ya existe en el servidor pero que el pull global
 * todavía no trajo (en un dispositivo nuevo o recién logueado eso es lo normal). Falla en
 * silencio (sin conexión, timeout): en ese caso se sigue con lo que haya localmente, y si se
 * llega a crear un duplicado, `guardarOdontogramaRemoto` lo reconcilia en la próxima sync. */
// 10s y no menos: en un dispositivo recién logueado esta consulta compite con toda la sync
// inicial (push + 7 pulls) y en pruebas tardó más de 5s. Mejor esperar un poco que mostrar un
// diagrama vacío a un paciente que sí tiene hallazgos (la odontóloga podría volver a marcarlos);
// si igual se agota, la reconciliación de duplicados lo corrige en la próxima sync.
export async function traerOdontogramasDelPaciente(pacienteId: string, timeoutMs = 10_000): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    const respuesta = await fetch(`/api/patients/${pacienteId}/odontogramas`, { signal: control.signal });
    if (!respuesta.ok) return;
    const { odontogramas }: { odontogramas: Odontograma[] } = await respuesta.json();
    await aplicarPaginaRemotaOdontogramas(odontogramas);
  } catch {
    // sin conexión / timeout / abortado — se sigue con lo local
  } finally {
    clearTimeout(temporizador);
  }
}

/** Mismo criterio que `aplicarPaginaRemotaCitas` — no pisa una edición local pendiente. */
async function aplicarPaginaRemotaOdontogramas(odontogramas: Odontograma[]): Promise<void> {
  for (const remoto of odontogramas) {
    const local = await db.odontogramas.get(remoto.id);
    if (!local) {
      // Puede existir un duplicado local con otro id (mismo paciente + dentición).
      await guardarOdontogramaRemoto(remoto);
      continue;
    }

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(remoto.id)
      .and((op) => op.entidad === "ODONTOGRAMA")
      .count();
    if (tienePendiente > 0) continue;

    if (remoto.version > local.version) {
      await db.odontogramas.put(remoto);
    }
  }
}

/** Pull incremental global de Odontograma (research.md #9) — mismo patrón que
 * `pullCitasDesdeServidor`, watermark propio. */
export async function pullOdontogramasDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_ODONTOGRAMAS);
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LOTE_PULL) });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/odontogramas?${params}`);
    } catch {
      return;
    }
    if (!respuesta.ok) return;

    const { odontogramas }: { odontogramas: Odontograma[] } = await respuesta.json();
    await aplicarPaginaRemotaOdontogramas(odontogramas);

    if (odontogramas.length < LOTE_PULL) break;
    pagina += 1;
  }

  await db.metaSync.put({
    clave: CLAVE_ULTIMA_SINCRONIZACION_ODONTOGRAMAS,
    valor: inicioDeEsteCiclo,
  });
}

/** CambioOdontograma es append-only (research.md #4): nunca hay conflicto de version que
 * reconciliar, solo agregar lo que todavía no exista localmente. */
async function aplicarPaginaRemotaCambiosOdontograma(
  cambios: CambioOdontograma[],
): Promise<void> {
  for (const remoto of cambios) {
    const local = await db.cambiosOdontograma.get(remoto.id);
    if (!local) await db.cambiosOdontograma.put(remoto);
  }
}

/** Pull incremental global de CambioOdontograma (research.md #9). */
export async function pullCambiosOdontogramaDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(
    CLAVE_ULTIMA_SINCRONIZACION_CAMBIOS_ODONTOGRAMA,
  );
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LOTE_PULL) });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/cambios-odontograma?${params}`);
    } catch {
      return;
    }
    if (!respuesta.ok) return;

    const { cambios }: { cambios: CambioOdontograma[] } = await respuesta.json();
    await aplicarPaginaRemotaCambiosOdontograma(cambios);

    if (cambios.length < LOTE_PULL) break;
    pagina += 1;
  }

  await db.metaSync.put({
    clave: CLAVE_ULTIMA_SINCRONIZACION_CAMBIOS_ODONTOGRAMA,
    valor: inicioDeEsteCiclo,
  });
}

/** Mismo criterio que `aplicarPaginaRemotaOdontogramas`. */
async function aplicarPaginaRemotaPlanTratamiento(items: ItemPlanTratamiento[]): Promise<void> {
  for (const remoto of items) {
    const local = await db.itemsPlanTratamiento.get(remoto.id);
    if (!local) {
      await db.itemsPlanTratamiento.put(remoto);
      continue;
    }

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(remoto.id)
      .and((op) => op.entidad === "ITEM_PLAN_TRATAMIENTO")
      .count();
    if (tienePendiente > 0) continue;

    if (remoto.version > local.version) {
      await db.itemsPlanTratamiento.put(remoto);
    }
  }
}

/** Pull incremental global de ItemPlanTratamiento (research.md #9). */
export async function pullPlanTratamientoDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_PLAN_TRATAMIENTO);
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LOTE_PULL) });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/plan-tratamiento?${params}`);
    } catch {
      return;
    }
    if (!respuesta.ok) return;

    const { items }: { items: ItemPlanTratamiento[] } = await respuesta.json();
    await aplicarPaginaRemotaPlanTratamiento(items);

    if (items.length < LOTE_PULL) break;
    pagina += 1;
  }

  await db.metaSync.put({
    clave: CLAVE_ULTIMA_SINCRONIZACION_PLAN_TRATAMIENTO,
    valor: inicioDeEsteCiclo,
  });
}

/** Mismo criterio que `aplicarPaginaRemota` de Paciente — no pisa una edición local
 * pendiente de sincronizar. */
async function aplicarPaginaRemotaInsumos(insumos: Insumo[]): Promise<void> {
  for (const remoto of insumos) {
    const local = await db.insumos.get(remoto.id);
    if (!local) {
      await db.insumos.put(remoto);
      continue;
    }

    const tienePendiente = await db.outboxOperations
      .where("entidadId")
      .equals(remoto.id)
      .and((op) => op.entidad === "INSUMO")
      .count();
    if (tienePendiente > 0) continue;

    if (remoto.version > local.version) {
      await db.insumos.put(remoto);
    }
  }
}

/**
 * Pull incremental de Insumo (010-gestion-insumos) — mismo patrón de paginación +
 * watermark que `pullCambiosDesdeServidor` (Paciente), watermark propio. `estado=TODOS`
 * porque el espejo local necesita también los archivados (la pestaña "Archivados" del
 * listado los muestra sin pegarle a la red).
 */
export async function pullInsumosDesdeServidor(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const marcaAnterior = await db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_INSUMOS);
  const inicioDeEsteCiclo = new Date().toISOString();

  let pagina = 1;
  for (;;) {
    const params = new URLSearchParams({
      estado: "TODOS",
      pagina: String(pagina),
      limite: String(LOTE_PULL),
    });
    if (marcaAnterior) params.set("desde", marcaAnterior.valor);

    let respuesta: Response;
    try {
      respuesta = await fetch(`/api/insumos?${params}`);
    } catch {
      return; // sin conexión a mitad de camino — se reintenta en el próximo ciclo
    }
    if (!respuesta.ok) return;

    const { insumos }: { insumos: Insumo[] } = await respuesta.json();
    await aplicarPaginaRemotaInsumos(insumos);

    if (insumos.length < LOTE_PULL) break;
    pagina += 1;
  }

  await db.metaSync.put({ clave: CLAVE_ULTIMA_SINCRONIZACION_INSUMOS, valor: inicioDeEsteCiclo });
}

/**
 * Evita que dos ciclos se pisen: el intervalo dispara cada 30s, pero un ciclo con muchos
 * pendientes puede tardar más que eso. Sin este guard, dos ciclos simultáneos se pelearían por
 * el store de progreso y el porcentaje saltaría de forma errática
 * (011-indicador-sincronizacion).
 */
let cicloEnCurso = false;
/**
 * Un disparo que llega con un ciclo en curso no se descarta: se recuerda y se atiende apenas
 * ese ciclo termina. Descartarlo sin más retrasaría hasta 30s (el siguiente tick del
 * intervalo) el envío de un cambio recién hecho, que es justo el caso que el evento "online"
 * y el guardado de un registro intentan cubrir.
 */
let cicloPendiente = false;

/** true hasta que corre el primer ciclo desde que se cargó la app (módulo recién evaluado);
 * la navegación interna no lo reinicia, una recarga completa sí. */
let primerCicloDeEstaCarga = true;

async function ejecutarCicloDeSync(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (cicloEnCurso) {
    cicloPendiente = true;
    return;
  }

  cicloEnCurso = true;
  try {
    // Envíos que quedaron a medias (la app se cerró, se recargó o se congeló en pleno POST)
    // vuelven a la cola antes de contar — si no, el indicador los contaba como pendientes
    // pero nunca se reenviaban (ver `recuperarEnviosHuerfanos`). En el primer ciclo de esta
    // carga de la app ningún envío propio puede estar en vuelo todavía, así que todo
    // `ENVIANDO` es de una sesión anterior y se recupera ya; después, solo los que pasaron
    // el umbral (un envío reciente puede seguir en vuelo). Reenviar de más es inocuo: el
    // servidor es idempotente por id de operación.
    await recuperarEnviosHuerfanos(primerCicloDeEstaCarga ? 0 : ANTIGUEDAD_ENVIO_HUERFANO_MS);
    primerCicloDeEstaCarga = false;

    // Push: vaciar la cola de pendientes (en lotes, mezclando Paciente, Consultorio y Cita)
    // antes de traer del servidor.
    const totalPendientes = await contarOperacionesPendientes();
    if (totalPendientes > 0) {
      iniciarPush(totalPendientes);

      let hayPendientes = true;
      while (hayPendientes) {
        const resueltas = await sincronizarLote();
        // Un lote que no resolvió ninguna operación (error de red o del servidor) vuelve a
        // dejarlas en PENDIENTE — reintentarlo acá mismo repetiría exactamente el mismo lote
        // con el mismo resultado, girando en el lugar para siempre. Se corta y se reintenta en
        // el próximo ciclo (30s), que es lo que el comentario de `sincronizarLote` ya decía que
        // pasaba pero el bucle no respetaba.
        if (resueltas === 0) break;
        marcarEnviadas(resueltas);
        hayPendientes = await hayOperacionesPendientes();
      }
    }

    // El pull no tiene un total conocible de antemano (es paginado hasta agotarse), así que a
    // partir de acá el indicador muestra actividad sin porcentaje (FR-005).
    pasarAPull();

    await pullConsultoriosDesdeServidor();
    await pullCambiosDesdeServidor();
    await pullCitasDesdeServidor();
    await pullOdontogramasDesdeServidor();
    await pullCambiosOdontogramaDesdeServidor();
    await pullPlanTratamientoDesdeServidor();
    await pullInsumosDesdeServidor();

    // Marca de "última sincronización" que ve el odontólogo (FR-006). No distingue si algún
    // pull falló por un error del servidor: cada uno traga sus propios errores y no los
    // propaga (research.md #5 — esa precisión no justifica encadenar un booleano por las 7
    // funciones). Lo que sí se vuelve a chequear es la conexión: si se cortó a mitad del
    // ciclo, los 7 pulls salieron en seco por su propio guard y no se trajo nada, así que
    // escribir el timestamp acá sería afirmar una sincronización que no ocurrió.
    if (typeof navigator === "undefined" || navigator.onLine) {
      await db.metaSync.put({
        clave: CLAVE_ULTIMA_SINCRONIZACION_GENERAL,
        valor: new Date().toISOString(),
      });
    }
  } finally {
    // En `finally` para que el indicador no quede clavado en "Sincronizando…" si algo revienta
    // a mitad del ciclo.
    finalizarCiclo();
    cicloEnCurso = false;
  }

  // Hubo al menos un disparo mientras este ciclo corría — se atiende ahora. Fuera del
  // `finally` y del `try`: si el ciclo anterior falló, encadenar otro acá arriesgaría un
  // bucle de reintentos sin pausa.
  if (cicloPendiente) {
    cicloPendiente = false;
    await ejecutarCicloDeSync();
  }
}

let intervaloId: ReturnType<typeof setInterval> | undefined;

/** Arranca el motor de sync: al reconectar y cada INTERVALO_REINTENTO_MS. */
export function iniciarSyncEngine(): () => void {
  const intentar = () => void ejecutarCicloDeSync();

  // Al perder la conexión no hay nada que reintentar, pero sí hay que soltar el estado de
  // "sincronizando": las funciones de pull cortan en seco con su guard de `navigator.onLine`
  // y el ciclo nunca llega a su `finally`, dejando el indicador clavado
  // (011-indicador-sincronizacion, research.md #6).
  const alPerderConexion = () => finalizarCiclo();

  window.addEventListener("online", intentar);
  window.addEventListener("offline", alPerderConexion);
  intervaloId = setInterval(intentar, INTERVALO_REINTENTO_MS);
  intentar();

  return () => {
    window.removeEventListener("online", intentar);
    window.removeEventListener("offline", alPerderConexion);
    if (intervaloId) clearInterval(intervaloId);
  };
}
