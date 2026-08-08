# Data Model: Gestión de Insumos

## Insumo

Entidad de dominio (`src/domain/entities/Insumo.ts`), existe tanto en PostgreSQL (servidor)
como en IndexedDB (cliente, vía Dexie) con la misma forma — mismo patrón que `Paciente`.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el **cliente** al crear (research.md #3), no autoincremental de servidor — necesario para crear offline. |
| `nombre` | string | sí | No vacío (FR-001, FR-002). No es único — dos insumos pueden compartir nombre (spec §Edge Cases). |
| `categoria` | string \| null | no | Texto libre (research.md #5). Usada para el filtro por categoría (FR-009); las opciones del filtro se derivan de los valores distintos ya usados por insumos activos, no de un catálogo separado. |
| `stockActual` | integer | sí | ≥ 0 (FR-003). Se edita directamente al reponer o consumir (spec §Assumptions — no hay kardex de movimientos en esta feature). |
| `stockMinimo` | integer | sí | ≥ 0 (FR-003). Puede valer `0` (equivale a "avisar solo si se agota por completo", spec §Edge Cases). |
| `estado` | enum: `ACTIVO` \| `ARCHIVADO` | sí | Default `ACTIVO` al crear. |
| `version` | integer | sí | Empieza en 1; se incrementa en cada edición. Usado para detectar conflictos de sincronización entre dispositivos, igual que `Paciente`. |
| `conflictoPendiente` | objeto \| null | sí (puede ser null) | Mismo formato que `Paciente`: `{ versionServidor, versionDispositivo, detectadoEn }`. Null en el caso normal. |
| `createdAt` | datetime | sí | |
| `updatedAt` | datetime | sí | |

**Campo derivado, no almacenado**: `aReponer` (`boolean`) = `stockActual <= stockMinimo`.
Se calcula en cada lectura (repositorio Dexie y Prisma), nunca se persiste (research.md #4).
Es lo que la UI usa tanto para resaltar la fila en el listado (FR-005) como para el conteo
en la pantalla de Inicio (FR-006).

### Validaciones (derivadas de los Functional Requirements)

- `nombre`, `stockActual`, `stockMinimo` no pueden estar vacíos/ausentes (FR-002).
- `stockActual` y `stockMinimo` deben ser enteros ≥ 0 (FR-003); rechazados en la capa de
  aplicación (caso de uso), no solo en la UI (Principio III).
- Un insumo en estado `ARCHIVADO` no admite edición directa de sus campos — debe reactivarse
  primero (FR-012, US4-AC3).
- Archivar/reactivar son las únicas transiciones de `estado` permitidas; no existe borrado
  definitivo en esta feature (FR-013, FR-015).
- No hay validación de unicidad de `nombre` — a diferencia de `Paciente.documentoIdentidad`,
  no existe identificador único de negocio para `Insumo` (spec §Assumptions).

### Transiciones de estado

```
        crear
          │
          ▼
      ┌────────┐   archivar   ┌────────────┐
      │ ACTIVO │ ───────────► │ ARCHIVADO  │
      │        │ ◄─────────── │            │
      └────────┘   reactivar  └────────────┘
```

- Solo un insumo `ACTIVO` puede editarse (campos, incluido `stockActual`) o archivarse.
- Solo un insumo `ARCHIVADO` puede reactivarse; no admite edición de campos en ese estado.
- Archivar un insumo ya archivado es una operación sin efecto que informa el estado actual,
  no un error (spec §Edge Cases).
- El estado `ARCHIVADO` excluye al insumo del cálculo de `aReponer` mostrado por defecto
  (listado y tarjeta de Inicio), sin importar su stock (spec §User Story 2, AC4).

## OutboxOperation (entidad técnica de soporte, cliente) — extendida, no nueva

Ya existe para `Paciente` (`001-gestion-pacientes/data-model.md`). Esta feature le agrega un
campo para poder transportar operaciones de `Insumo` en el mismo mecanismo (research.md #2).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | Clave de idempotencia. Sin cambios. |
| `entidad` | enum: `PACIENTE` \| `INSUMO` | **Nuevo.** Indica contra qué repositorio (Prisma) debe aplicarse la operación al sincronizar. |
| `entidadId` | UUID | **Renombrado** desde `pacienteId` — referencia al `Paciente` o `Insumo` afectado, según `entidad`. |
| `tipo` | enum: `CREAR` \| `EDITAR` \| `ARCHIVAR` \| `REACTIVAR` | Sin cambios — ya era genérico. |
| `payload` | objeto | Snapshot de los campos a sincronizar (forma de `Paciente` o `Insumo` según `entidad`/`tipo`). |
| `baseVersion` | integer | Sin cambios. |
| `estado` | enum: `PENDIENTE` \| `ENVIANDO` \| `SINCRONIZADO` \| `CONFLICTO` | Sin cambios. |
| `createdAt` | datetime (local) | Sin cambios. |

El renombre de `pacienteId` → `entidadId` es el único cambio que toca código existente de
Pacientes; es mecánico (búsqueda y reemplazo + migración de los datos ya en IndexedDB de
usuarios existentes) y no cambia ningún comportamiento observable.

## Relaciones

- `OutboxOperation.entidadId` → `Insumo.id` (cuando `entidad = INSUMO`) o `Paciente.id`
  (cuando `entidad = PACIENTE`) — muchos a uno.
- `Insumo` no tiene relaciones con otras entidades del dominio en esta feature (sin
  proveedor, sin categoría como entidad separada — research.md #5).
