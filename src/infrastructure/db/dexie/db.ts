import Dexie, { Table } from "dexie";
import { Paciente } from "@/domain/entities/Paciente";
import { Consultorio } from "@/domain/entities/Consultorio";
import { Cita } from "@/domain/entities/Cita";
import { Odontograma } from "@/domain/entities/Odontograma";
import { CambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import { Insumo } from "@/domain/entities/Insumo";

export type EntidadOutbox =
  | "PACIENTE"
  | "CONSULTORIO"
  | "CITA"
  | "ODONTOGRAMA"
  | "CAMBIO_ODONTOGRAMA"
  | "ITEM_PLAN_TRATAMIENTO"
  | "INSUMO";
export type TipoOperacionOutbox =
  | "CREAR"
  | "EDITAR"
  | "ARCHIVAR"
  | "REACTIVAR"
  | "ELIMINAR"
  | "FINALIZAR";
export type EstadoOutbox = "PENDIENTE" | "ENVIANDO" | "SINCRONIZADO" | "CONFLICTO";

/**
 * OutboxOperation — data-model.md §OutboxOperation. Solo existe en el cliente (Dexie).
 * Generalizada en 004-consultorios (research.md #1) para llevar operaciones de más de una
 * entidad en la misma cola: `entidadId`/`entidad` reemplazan al `pacienteId` original.
 * `baseVersion` solo tiene sentido para `PACIENTE`/`EDITAR` — Consultorio no la usa
 * (research.md #2).
 */
export interface OutboxOperation {
  /** Clave de idempotencia — el servidor no la vuelve a aplicar si se reintenta. */
  id: string;
  entidad: EntidadOutbox;
  entidadId: string;
  tipo: TipoOperacionOutbox;
  payload: unknown;
  baseVersion?: number;
  estado: EstadoOutbox;
  createdAt: string;
  /** Cuándo pasó a `ENVIANDO` (ISO). Sin esto no hay forma de saber si un envío quedó
   * huérfano — ver `recuperarEnviosHuerfanos` en outboxQueue.ts. Ausente en operaciones
   * marcadas antes de que existiera el campo (también se tratan como huérfanas). */
  enviandoDesde?: string;
}

/**
 * Metadatos de sincronización — usada por el motor de sync para el pull incremental
 * (research.md #12 de 003-historia-clinica-paciente). No es una entidad de dominio, solo
 * bookkeeping local.
 */
export interface MetaSync {
  clave: string;
  valor: string;
}

export const CLAVE_ULTIMA_SINCRONIZACION = "ultimaSincronizacion";
/** 005-atencion-paciente — watermark propio del pull incremental de Cita, separado del de
 * Paciente porque son endpoints y ciclos de paginación independientes. */
export const CLAVE_ULTIMA_SINCRONIZACION_CITAS = "ultimaSincronizacionCitas";
/** 006-odontograma — watermarks propios del pull incremental de cada entidad nueva
 * (research.md #9), mismo criterio que `CLAVE_ULTIMA_SINCRONIZACION_CITAS`. */
export const CLAVE_ULTIMA_SINCRONIZACION_ODONTOGRAMAS = "ultimaSincronizacionOdontogramas";
export const CLAVE_ULTIMA_SINCRONIZACION_CAMBIOS_ODONTOGRAMA =
  "ultimaSincronizacionCambiosOdontograma";
export const CLAVE_ULTIMA_SINCRONIZACION_PLAN_TRATAMIENTO =
  "ultimaSincronizacionPlanTratamiento";
/** 010-gestion-insumos — watermark propio del pull incremental de Insumo, mismo criterio
 * que los de Cita/Odontograma: endpoints y ciclos de paginación independientes. */
export const CLAVE_ULTIMA_SINCRONIZACION_INSUMOS = "ultimaSincronizacionInsumos";
/**
 * 011-indicador-sincronizacion — a diferencia de las claves de arriba, esta NO es un
 * watermark de pull incremental: no se usa para pedirle nada al servidor, solo para mostrarle
 * al odontólogo "última sincronización: hace N min" (FR-006). Marca el fin de un ciclo
 * completo (push + los 6 pulls), no el de una entidad puntual.
 */
export const CLAVE_ULTIMA_SINCRONIZACION_GENERAL = "ultimaSincronizacionGeneral";

/**
 * Base de datos local-first (IndexedDB vía Dexie). La UI lee/escribe siempre acá primero,
 * con o sin conexión — research.md #2 de 001-gestion-pacientes.
 */
class SistemaOdontologicoDB extends Dexie {
  pacientes!: Table<Paciente, string>;
  outboxOperations!: Table<OutboxOperation, string>;
  metaSync!: Table<MetaSync, string>;
  consultorios!: Table<Consultorio, string>;
  citas!: Table<Cita, string>;
  odontogramas!: Table<Odontograma, string>;
  cambiosOdontograma!: Table<CambioOdontograma, string>;
  itemsPlanTratamiento!: Table<ItemPlanTratamiento, string>;
  insumos!: Table<Insumo, string>;

  constructor() {
    super("sistema-odontologico");
    this.version(1).stores({
      pacientes: "id, documentoIdentidad, nombreCompleto, estado",
      outboxOperations: "id, pacienteId, estado, createdAt",
    });
    // v2 — research.md #12: agrega metaSync para el pull incremental. No destructiva,
    // las tablas de v1 no cambian.
    this.version(2).stores({
      metaSync: "clave",
    });
    // v3 — 003-historia-clinica-paciente (research.md #4): agrega los campos de historia
    // clínica a Paciente. Aditiva y sin nuevos índices (no se buscan/filtran en esta
    // feature) — los registros de v1/v2 ya existentes en IndexedDB no tienen estas
    // propiedades en absoluto (a diferencia de Postgres, que sí aplica sus defaults de
    // schema). El hook de lectura de abajo normaliza esos registros al vuelo.
    this.version(3).stores({
      pacientes: "id, documentoIdentidad, nombreCompleto, estado",
    });
    // v4 — 004-consultorios (research.md #1, #6): generaliza el outbox (`pacienteId` ->
    // `entidadId` + discriminador `entidad`) para poder llevar operaciones de Consultorio
    // en la misma cola, y agrega la tabla `consultorios` (espejo local-first). El
    // `upgrade()` migra los registros de outbox ya existentes en vez de perderlos.
    this.version(4)
      .stores({
        outboxOperations: "id, entidadId, estado, createdAt",
        consultorios: "id, nombre",
      })
      .upgrade(async (tx) => {
        await tx
          .table("outboxOperations")
          .toCollection()
          .modify((op: OutboxOperation & { pacienteId?: string }) => {
            if (op.pacienteId !== undefined) {
              op.entidadId = op.pacienteId;
              delete op.pacienteId;
            }
            op.entidad ??= "PACIENTE";
          });
      });

    // v5 — 005-atencion-paciente (research.md #6, #8, #9): agrega la tabla `citas`
    // (índice compuesto `[pacienteId+estado]` para "una cita en curso a la vez" y para el
    // historial de citas anteriores, ambos sin round-trip de red) y extiende
    // `EntidadOutbox` a `"CITA"` — no requiere `upgrade()` porque ninguna tabla existente
    // cambia de forma, solo se agrega una nueva.
    this.version(5).stores({
      citas: "id, pacienteId, estado, [pacienteId+estado]",
    });

    // v6 — 006-odontograma (research.md #2, #3, #5, #9): agrega `odontogramas` (índice
    // compuesto `[pacienteId+denticion]`, mismo criterio que `[pacienteId+estado]` de
    // `citas`), `cambiosOdontograma` (índice compuesto `[odontogramaId+registradoEn]` para
    // listar el historial de una dentición sin traer las demás) e `itemsPlanTratamiento`;
    // extiende `EntidadOutbox` con las 3 entidades nuevas — no requiere `upgrade()` porque
    // ninguna tabla existente cambia de forma.
    // `&[pacienteId+denticion]` es único (no solo indexado): a lo sumo un Odontograma por
    // paciente y dentición — sin esto, dos llamadas a `obtenerOCrear` casi simultáneas
    // podrían insertar dos filas locales con ids distintos para el mismo par, algo que
    // además puede ocurrir al mezclarse con el pull del servidor si el id no coincide.
    this.version(6).stores({
      odontogramas: "id, pacienteId, denticion, &[pacienteId+denticion]",
      cambiosOdontograma: "id, odontogramaId, registradoEn, [odontogramaId+registradoEn]",
      itemsPlanTratamiento: "id, pacienteId, fecha",
    });

    // v7 — 010-gestion-insumos: agrega la tabla `insumos` y extiende `EntidadOutbox` con
    // `"INSUMO"`. Sin `upgrade()`: ninguna tabla existente cambia de forma, solo se agrega
    // una nueva (el outbox ya quedó generalizado por `entidad`/`entidadId` en la v4, así
    // que Insumo no necesita migrar nada ahí). `categoria` va indexada porque el filtro por
    // categoría del listado la consulta directamente (FR-009); "a reponer" NO se indexa —
    // es un valor derivado que no existe como campo (research.md #4).
    this.version(7).stores({
      insumos: "id, nombre, categoria, estado",
    });

    // Normaliza cualquier Paciente leído de IndexedDB (get/toArray/toCollection, incluido
    // useLiveQuery) para que los campos opcionales agregados después de la v1 siempre
    // tengan sus defaults, incluso en registros creados antes de esas features — sin
    // esto, cualquier lectura directa de un registro viejo revienta con "Cannot read
    // properties of undefined".
    this.pacientes.hook("reading", (obj) => {
      // Dexie invoca este hook incluso cuando no hubo coincidencia (ej. get() de un id
      // inexistente) — sin este guard, ese caso normal revienta el hook mismo.
      if (!obj) return obj;
      obj.antecedentesPatologicos ??= [];
      // Los 4 campos de abajo eran texto libre (string | null) — pasaron a listas de
      // etiquetas (008-rediseno-visual-sistema). `Array.isArray` cubre tanto los
      // registros viejos (string/null) como los que ya vienen normalizados.
      if (!Array.isArray(obj.antecedentesPatologicosOtros)) obj.antecedentesPatologicosOtros = [];
      if (!Array.isArray(obj.antecedentesHeredofamiliares)) obj.antecedentesHeredofamiliares = [];
      if (!Array.isArray(obj.medicamentosActuales)) obj.medicamentosActuales = [];
      if (!Array.isArray(obj.alergias)) obj.alergias = [];
      obj.consultorioId ??= null;
      return obj;
    });

    // Idem para Odontograma — `notas` se agregó después de la v6 original (segunda ronda
    // de feedback, notas independientes de hallazgos); registros locales creados antes de
    // este cambio no lo tienen. Campo embebido en una tabla existente, sin índice nuevo —
    // no amerita bump de versión de esquema, solo normalización en lectura (mismo criterio
    // que el hook de `pacientes` arriba).
    this.odontogramas.hook("reading", (obj) => {
      if (!obj) return obj;
      obj.notas ??= [];
      return obj;
    });

    // Idem para CambioOdontograma — `snapshot` se agregó después de la v6 original
    // (tercera ronda de feedback, pestaña Historial reconstruida); registros locales
    // creados antes de este cambio no lo tienen. Mismo criterio: campo no indexado en una
    // tabla existente, sin bump de versión de esquema.
    this.cambiosOdontograma.hook("reading", (obj) => {
      if (!obj) return obj;
      obj.snapshot ??= null;
      return obj;
    });
  }
}

export const db = new SistemaOdontologicoDB();
