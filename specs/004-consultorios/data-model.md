# Data Model: Consultorios (clasificación de pacientes por sede)

## Consultorio

Entidad de dominio nueva (`src/domain/entities/Consultorio.ts`). Existe tanto en
PostgreSQL (servidor) como en IndexedDB (cliente, vía Dexie) con la misma forma —
local-first igual que `Paciente` (research.md #1, #5).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el **cliente** al crear, igual que `Paciente.id` (spec `001-gestion-pacientes`, research.md #3) — necesario para crear offline. |
| `nombre` | string | sí | No vacío. Único sin distinguir mayúsculas/minúsculas (FR-003). |
| `nombreNormalizado` | string | sí | Derivado de `nombre` (`trim().toLowerCase()`), calculado en la capa de aplicación, nunca editable directamente. Es la columna que lleva la restricción única en PostgreSQL (research.md #4). No existe en el dominio ni en Dexie — es un detalle exclusivo de `ConsultorioRepositoryPrisma`. |
| `createdAt` | datetime | sí | |

### Validaciones (derivadas de los Functional Requirements)

- `nombre` no puede estar vacío (FR-002).
- `nombre` debe ser único entre todos los consultorios, sin distinguir
  mayúsculas/minúsculas (FR-003). Se valida en la capa de aplicación (caso de uso) antes
  de persistir, tanto en el repositorio Dexie (contra la copia local, para feedback
  instantáneo) como en el repositorio Prisma (contra la base, fuente de verdad) — mismo
  patrón que `documentoIdentidad` de `Paciente`.
- No existe operación de edición en esta feature — solo `crear` y `eliminar` (spec
  §Assumptions). No hay transiciones de estado que modelar.

### Relaciones

- Un `Consultorio` puede estar referenciado por cero o más `Paciente` (`Paciente.consultorioId`).
- Eliminar un `Consultorio` DEBE dejar `consultorioId = null` en todos los `Paciente` que
  lo tenían asignado (FR-005) — ver `Paciente` más abajo y research.md #6 para cómo se
  aplica esto en cada capa de almacenamiento.

## Paciente (modificado)

Ya definido en `specs/001-gestion-pacientes/data-model.md` (y extendido por
`003-historia-clinica-paciente`). Esta feature agrega un único campo nuevo:

| Campo nuevo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `consultorioId` | UUID (string) \| `null` | no | Referencia opcional a `Consultorio.id` (FR-006, FR-007). `null` significa "sin consultorio asignado" — es el valor por defecto al crear (FR-009) y el valor al que cae automáticamente si su consultorio es eliminado (FR-005). |

No se agrega ningún otro campo ni se modifica el comportamiento existente de `Paciente`
(archivado, búsqueda, historia clínica, etc.).

## OutboxOperation (modificado — cliente, Dexie)

Ya definido en `specs/001-gestion-pacientes/data-model.md`. Se generaliza para poder
llevar operaciones de más de una entidad (research.md #1):

| Campo | Antes | Ahora | Notas |
|---|---|---|---|
| `pacienteId` | obligatorio | **renombrado a `entidadId`** | Referencia al registro afectado, sin importar la entidad. |
| — | — | **`entidad: "PACIENTE" \| "CONSULTORIO"`** (nuevo) | Discriminador — le dice al servidor y al propio motor de sync a qué repositorio corresponde esta operación. |
| `tipo` | `"CREAR" \| "EDITAR" \| "ARCHIVAR" \| "REACTIVAR"` | sin cambios para `PACIENTE`; para `CONSULTORIO` solo se usan `"CREAR"` y `"ELIMINAR"` (nuevo valor) | `Consultorio` no tiene `EDITAR`/`ARCHIVAR`/`REACTIVAR` (research.md #2). |
| `baseVersion` | obligatorio | **opcional** | Solo tiene sentido para `PACIENTE`/`EDITAR` (detección de conflicto). Las operaciones de `Consultorio` no lo usan. |
| `payload`, `id`, `estado`, `createdAt` | — | sin cambios | Misma mecánica de cola para ambas entidades (research.md #1). |

La mecánica de la cola (encolar, tomar lote, marcar enviando/sincronizado/conflicto,
reintentar) no cambia — sigue operando sobre `estado`/`createdAt` sin importarle qué
`entidad` es cada operación.

## MetaSync (sin cambios)

Ya definido en `002-pantalla-inicio`. No se modifica — el pull de `Consultorio` no usa
marca de tiempo incremental (research.md #5), así que no agrega una clave nueva acá.

## Relaciones (resumen)

- `Paciente.consultorioId` → `Consultorio.id` (muchos a uno, opcional). `onDelete:
  SetNull` en PostgreSQL; reconciliación explícita equivalente en Dexie (research.md #6).
- `OutboxOperation.entidadId` → `Paciente.id` **o** `Consultorio.id`, según
  `OutboxOperation.entidad` (uno a muchos en ambos casos — un registro puede tener varias
  operaciones pendientes acumuladas offline, aplicadas en orden).
- No hay otras entidades ni relaciones nuevas en esta feature.
