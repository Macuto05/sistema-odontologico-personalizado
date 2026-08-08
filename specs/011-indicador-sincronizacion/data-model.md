# Data Model: Indicador de Estado de Sincronización

No se agrega ninguna tabla nueva a Dexie ni ninguna entidad de dominio persistida. Todo lo de
abajo es estado derivado (en memoria) o una clave nueva en la tabla `metaSync` que ya existe.

## `EstadoSyncUI` (derivado, no persistido)

Unión discriminada que devuelve `derivarEstadoSync()` (research.md #3), consumida por
`SyncStatusPill`:

```ts
type EstadoSyncUI =
  | { tipo: "OFFLINE"; pendientes: number }
  | { tipo: "SINCRONIZANDO"; progreso: { total: number; enviadas: number } | null } // null = etapa de pull, sin %
  | { tipo: "CONFLICTO"; entidades: EntidadEnConflicto[] }
  | { tipo: "AL_DIA"; ultimaSincronizacion: string | null }; // ISO string
```

**Refinamiento durante la implementación**: `progreso: null` por sí solo era ambiguo — no
distingue "el pull está activo" (mostrar `SINCRONIZANDO` sin %) de "no hay ciclo corriendo"
(mostrar `AL_DIA`/`CONFLICTO`). El store expone entonces una **fase** explícita, y
`derivarEstadoSync` la usa como discriminante:

```ts
type FaseSync = "INACTIVO" | "PUSH" | "PULL";
```

| Fase | Estado derivado (si hay conexión) |
|---|---|
| `PUSH` | `SINCRONIZANDO` con `progreso: { total, enviadas }` |
| `PULL` | `SINCRONIZANDO` con `progreso: null` |
| `INACTIVO` | `CONFLICTO` si hay conflictos, si no `AL_DIA` |

**Entradas** (todas ya existen o se agregan en este feature — ninguna requiere una llamada de
red nueva):

| Campo | Origen |
|---|---|
| `online` | `navigator.onLine` + listeners `online`/`offline` (research.md #6) |
| `pendientes` | `count()` de `db.outboxOperations` con `estado` en `PENDIENTE`/`ENVIANDO` (índice ya existe) |
| `conflictos` | `db.outboxOperations` con `estado === "CONFLICTO"` (índice ya existe) |
| `progreso` | `syncStatus.ts`, store en memoria (research.md #4) |
| `ultimaSincronizacion` | `db.metaSync.get(CLAVE_ULTIMA_SINCRONIZACION_GENERAL)` (nueva clave, research.md #5) |

**Prioridad** (FR-009, ya validada con el usuario): `OFFLINE` > `SINCRONIZANDO` >
`CONFLICTO` > `AL_DIA`.

## `EntidadEnConflicto` (derivado, no persistido)

Proyección de las filas de `db.outboxOperations` en estado `CONFLICTO`/`RECHAZADO`, para el
panel desplegable (FR-008). **Una entrada por registro afectado, no por operación**:

```ts
interface EntidadEnConflicto {
  entidad: EntidadOutbox;      // ya existe en OutboxOperation
  entidadId: string;           // ya existe
  tipos: TipoOperacionOutbox[]; // todas las operaciones fallidas de ese registro, sin repetir
  nombre: string | null;        // nombre propio: Paciente/Consultorio/Insumo
  pacienteId: string | null;    // dueño del registro, si el payload lo trae
  nombrePaciente: string | null; // resuelto contra la base local
}
```

### Agrupación por registro (corregido durante la implementación)

La primera versión emitía una entrada **por operación** y usaba `entidad-entidadId` como
clave de React. Un mismo registro puede acumular varias operaciones en conflicto (ej. `CREAR`
y `EDITAR` del mismo odontograma), así que esa clave se repetía y React abortaba el
renderizado del panel (`Encountered two children with the same key`). Reportado por el usuario
con dos odontogramas reales.

Ahora se agrupa por `entidad|entidadId`: la clave vuelve a ser única por construcción, el panel
no repite el mismo registro, y el contador del pill pasa a significar "cuántas fichas hay que
revisar" en vez de "cuántos envíos fallaron" — que es la pregunta que el odontólogo realmente
se hace.

### Cómo se identifica cada registro

| Entidad | Qué se muestra | De dónde sale |
|---|---|---|
| Paciente | `Paciente "Ana González"` | `nombreCompleto` del payload |
| Consultorio, Insumo | `Insumo "Guantes"` | `nombre` del payload |
| Odontograma, Cita, Ítem de plan | `Odontograma — Ana González` | `pacienteId` del payload, resuelto contra `db.pacientes` |
| Cambio de odontograma | `Cambio de odontograma` | sin identificación: su payload referencia `odontogramaId`, no el paciente |

**Nunca se muestra el `entidadId`**: un uuid crudo en pantalla no le dice nada al odontólogo.
Cuando no hay ni nombre propio ni paciente resoluble, se muestra solo el tipo de registro.

La resolución del nombre del paciente la hace `useSyncStatus` con un `bulkGet` sobre
`db.pacientes`, acotado a los ids que aparecen en la lista de conflictos (corta por
definición) — no recorre la tabla ni pega a la red. `derivarEstadoSync` sigue siendo una
función pura: recibe el mapa `nombresPorPacienteId` ya resuelto como parte de su entrada.

## `ProgresoSync` (en memoria, `syncStatus.ts`)

```ts
interface EstadoProgresoSync {
  fase: FaseSync;   // "INACTIVO" | "PUSH" | "PULL"
  total: number;    // pendientes en el outbox al iniciar el ciclo de push
  enviadas: number; // cuántas de esas ya se enviaron
}
```

No se persiste (research.md #4). Pasa a `PULL` (perdiendo el %) cuando termina el push, y
vuelve a `INACTIVO` al terminar el ciclo completo. Al recargar la página arranca en
`INACTIVO`.

El porcentaje que se muestra es `Math.round((enviadas / total) * 100)`, con `total === 0`
tratado como caso imposible en fase `PUSH` (si no hay nada que enviar, el ciclo no entra en
esa fase).

## `MetaSync` — nueva clave (tabla ya existente, sin migración)

```ts
export const CLAVE_ULTIMA_SINCRONIZACION_GENERAL = "ultimaSincronizacionGeneral";
```

Mismo shape que las 6 claves `CLAVE_ULTIMA_SINCRONIZACION_*` que ya existen en
`src/infrastructure/db/dexie/db.ts` — una fila más en la tabla `metaSync` (`clave, valor`), sin
bump de versión de Dexie.
