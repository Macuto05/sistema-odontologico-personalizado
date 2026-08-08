# Data Model: Gestión de Pacientes

## Paciente

Entidad de dominio (`src/domain/entities/Paciente.ts`), existe tanto en PostgreSQL
(servidor) como en IndexedDB (cliente, vía Dexie) con la misma forma.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el **cliente** al crear (ver research.md #3), no autoincremental de servidor — necesario para crear offline. |
| `nombreCompleto` | string | sí | No vacío. |
| `documentoIdentidad` | string | sí | No vacío. **Único** entre todos los pacientes, sin importar `estado` (FR-003, FR-004, edge case de la sección Edge Cases del spec). Convención: prefijo `V` o `E` (cédula venezolana/extranjera) pegado a los dígitos, sin puntos ni guion — ej. `V29838893`. La UI ofrece un selector de prefijo y formatea con puntos de miles solo para mostrar (`src/components/ui/documentoIdentidad.ts`); el valor guardado nunca lleva esa puntuación. |
| `fechaNacimiento` | date | sí | La edad no se guarda — se calcula en la UI a partir de esta fecha (`calcularEdad`, `src/components/pacientes/formatearFecha.ts`), siempre al día sin necesidad de recalcular datos guardados. |
| `telefono` | string | no | FR-002. |
| `email` | string | no | Si está presente, formato de email válido. |
| `direccion` | string | no | |
| `genero` | enum: `MASCULINO` \| `FEMENINO` \| `OTRO` \| null | no | Sin default — pacientes creados antes de este campo quedan en `null`. |
| `estadoCivil` | enum: `SOLTERO` \| `CASADO` \| `DIVORCIADO` \| `VIUDO` \| `UNION_LIBRE` \| null | no | Sin default. |
| `ocupacion` | string | no | Texto libre. |
| `estado` | enum: `ACTIVO` \| `ARCHIVADO` | sí | Default `ACTIVO` al crear. |
| `version` | integer | sí | Empieza en 1; se incrementa en cada edición. Usado para detectar conflictos de sincronización entre dispositivos (research.md #5). |
| `conflictoPendiente` | objeto \| null | sí (puede ser null) | Si un conflicto de sync fue detectado: `{ versionServidor, versionDispositivo, detectadoEn }`. Se limpia cuando el odontólogo revisa y confirma cuál versión conservar. Null en el caso normal (sin conflicto). |
| `createdAt` | datetime | sí | |
| `updatedAt` | datetime | sí | |

### Validaciones (derivadas de los Functional Requirements)

- `nombreCompleto`, `documentoIdentidad`, `fechaNacimiento` no pueden estar vacíos (FR-002).
- `documentoIdentidad` debe ser único en todo el conjunto de pacientes, incluidos los
  archivados (FR-003, FR-004). La validación de unicidad ocurre en la capa de aplicación
  (caso de uso), tanto al crear como al editar (FR-007), no solo en la UI (Principio III).
- Un paciente en estado `ARCHIVADO` no admite edición directa de sus campos — debe
  reactivarse primero (FR-008, US3-AC3).
- Archivar/reactivar son las únicas transiciones de `estado` permitidas; no existe borrado
  definitivo en esta feature (FR-009, FR-011).

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

- Solo un paciente `ACTIVO` puede editarse (campos) o archivarse.
- Solo un paciente `ARCHIVADO` puede reactivarse; no admite edición de campos en ese estado.
- Archivar un paciente ya archivado es una operación sin efecto que informa el estado
  actual, no un error (Edge Cases del spec).

## OutboxOperation (entidad técnica de soporte, cliente)

Vive únicamente en IndexedDB (Dexie), en el dispositivo — no se persiste en el servidor
como tal. Representa una mutación de `Paciente` pendiente de sincronizar.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | Clave de idempotencia — el servidor la usa para no aplicar dos veces la misma operación si se reintenta un lote. |
| `pacienteId` | UUID | Referencia al `Paciente` afectado. |
| `tipo` | enum: `CREAR` \| `EDITAR` \| `ARCHIVAR` \| `REACTIVAR` | |
| `payload` | objeto | Snapshot de los campos a sincronizar (forma de `Paciente` o subconjunto según `tipo`). |
| `baseVersion` | integer | El `version` de `Paciente` sobre el que se basó esta operación — usado para detectar conflicto (research.md #5). |
| `estado` | enum: `PENDIENTE` \| `ENVIANDO` \| `SINCRONIZADO` \| `CONFLICTO` | |
| `createdAt` | datetime (local) | |

No es una entidad de negocio del spec — existe porque la arquitectura local-first (decidida
en research.md #2) lo requiere. Se documenta acá porque tasks.md la va a necesitar
implementar junto con `Paciente`.

## Relaciones

- `OutboxOperation.pacienteId` → `Paciente.id` (muchos a uno; un paciente puede tener varias
  operaciones pendientes acumuladas mientras el dispositivo está offline, aplicadas en
  orden).
- No hay otras entidades ni relaciones en esta feature (historia clínica, turnos y
  facturación quedan fuera de alcance, spec §Key Entities).
