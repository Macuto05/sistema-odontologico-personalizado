# Data Model: Atención de Paciente (Cita Clínica)

## Cita

Entidad de dominio nueva (`src/domain/entities/Cita.ts`). Existe tanto en PostgreSQL
(servidor) como en IndexedDB (cliente, vía Dexie) con la misma forma — local-first igual
que `Paciente` (research.md #1, #6, #7), salvo el contenido de los archivos adjuntos (ver
`ArchivoEstudio` más abajo).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el **cliente** al crear (igual que `Paciente.id`/`Consultorio.id`) — necesario para iniciar una atención offline (research.md #6). |
| `pacienteId` | UUID (string) | sí | Referencia a `Paciente.id`. No editable después de creada. |
| `estado` | `"EN_CURSO"` \| `"FINALIZADA"` | sí | `"EN_CURSO"` al crear (FR-002). Pasa a `"FINALIZADA"` solo vía "Finalizar atención" (FR-014); no existe transición inversa (FR-016). |
| `categoria` | `CategoriaConsulta` \| `null` | no | Catálogo fijo (FR-006, research.md #12): `CONTROL`, `URGENCIA`, `LIMPIEZA_PROFILAXIS`, `ENDODONCIA`, `EXTRACCION`, `RESTAURACION_OBTURACION`, `ORTODONCIA`, `CIRUGIA`, `CONSULTA_GENERAL`, `OTRO`. |
| `motivoConsulta` | string \| `null` | no | Texto libre (FR-005). |
| `diagnostico` | string \| `null` | no | Texto libre (FR-005). |
| `planTratamiento` | string \| `null` | no | Texto libre (FR-005). |
| `recetaItems` | `ItemReceta[]` (JSON) | no (`[]` por defecto) | Ver `ItemReceta` abajo (FR-007, FR-008; research.md #2). |
| `estudioItems` | `EstudioItem[]` (JSON) | no (`[]` por defecto) | Ver `EstudioItem` abajo (FR-009, FR-010; research.md #2). |
| `version` | int | sí (default 1) | Detección de conflicto de sync — mismo mecanismo que `Paciente.version` (research.md #7). |
| `conflictoPendiente` | JSON \| `null` | no | Mismo formato que `Paciente.conflictoPendiente` (`{ versionServidor, versionDispositivo, detectadoEn }`). |
| `finalizadaEn` | datetime \| `null` | no | Se completa al finalizar (FR-014); `null` mientras está en curso. |
| `createdAt` | datetime | sí | |
| `updatedAt` | datetime | sí | Cualquier edición de los campos de arriba la actualiza — es lo que el pull incremental usa para detectar cambios, igual que `Paciente.updatedAt`. |

### ItemReceta (objeto embebido, dentro de `Cita.recetaItems`)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el cliente al agregar el ítem — permite quitarlo/identificarlo sin depender de su posición en el array. |
| `medicamento` | string | sí | |
| `dosis` | string | sí | |
| `frecuencia` | string | sí | |
| `duracion` | string | sí | |
| `indicaciones` | string \| `null` | no | Texto libre adicional, opcional (spec User Story 3). |

### EstudioItem (objeto embebido, dentro de `Cita.estudioItems`)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el cliente al agregar el ítem. Es el valor que referencia `ArchivoEstudio.estudioItemId` (research.md #3). |
| `nombre` | string | sí | Nombre/descripción del estudio solicitado (FR-009). |

### Validaciones (derivadas de los Functional Requirements)

- Ninguno de `motivoConsulta`, `diagnostico`, `planTratamiento`, `categoria` es obligatorio
  para guardar/finalizar una cita (FR-005, FR-006, User Story 6 escenario 3).
- `recetaItems`/`estudioItems` pueden estar vacíos (User Story 3/4, escenario 3).
- Un `ItemReceta` requiere `medicamento`, `dosis`, `frecuencia` y `duracion` no vacíos al
  agregarlo (FR-007) — `indicaciones` es el único campo opcional del ítem.
- Un `EstudioItem` requiere `nombre` no vacío al agregarlo (FR-009).
- Mientras `estado = "EN_CURSO"`: todos los campos de arriba son editables (FR-005 a
  FR-010).
- Cuando `estado = "FINALIZADA"`: `categoria`, `motivoConsulta`, `diagnostico`,
  `planTratamiento`, `recetaItems` y el `nombre` de cada `EstudioItem` quedan de solo
  lectura (FR-015) — rechazado tanto en la UI como en el repositorio (`CitaFinalizadaError`,
  research.md #10). **Excepción**: se puede seguir agregando `ArchivoEstudio` a un
  `EstudioItem` ya existente (FR-017) — no se pueden agregar `EstudioItem` nuevos ni
  `ItemReceta` nuevos.
- Un paciente solo puede tener una `Cita` con `estado = "EN_CURSO"` a la vez (spec
  Assumptions; research.md #6): antes de crear, el caso de uso busca una existente para ese
  `pacienteId` y la reabre en vez de duplicar.
- Iniciar una `Cita` requiere que el `Paciente` esté `ACTIVO` (FR-001; reutiliza
  `puedeEditarse(paciente)` de `001-gestion-pacientes`).

### Transiciones de estado

```text
(crear) → EN_CURSO → [Finalizar atención] → FINALIZADA
```

No hay transición de `FINALIZADA` de vuelta a `EN_CURSO` en esta feature (FR-016).

## ArchivoEstudio

Entidad nueva, **solo servidor** (PostgreSQL vía Prisma) — no tiene contraparte en Dexie
(research.md #3, #5). El cliente solo guarda su metadata como parte del snapshot sincronizado
de la `Cita` (ver más abajo), nunca el contenido.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Generado en el servidor al recibir la subida (a diferencia de `Cita`/`ItemReceta`/`EstudioItem`, esta operación siempre es online — research.md #5 — así que no necesita generarse offline). |
| `citaId` | UUID (string) | sí | Referencia a `Cita.id` (FK, `onDelete: Cascade`). |
| `estudioItemId` | UUID (string) | sí | Referencia al `id` de un `EstudioItem` dentro de `Cita.estudioItems` — sin FK de base de datos (no es una tabla), validado en la capa de aplicación contra la Cita indicada. |
| `nombreArchivo` | string | sí | Nombre original del archivo subido. |
| `tipo` | `"IMAGEN"` \| `"PDF"` | sí | Determinado por el tipo MIME recibido; cualquier otro valor se rechaza (FR-018). |
| `contenido` | bytes | sí | Contenido binario del archivo (research.md #4). Nunca se incluye en una consulta que no sea la de descarga puntual (Principio VIII). |
| `createdAt` | datetime | sí | |

### Validaciones

- `tipo` debe resolverse a `IMAGEN` o `PDF` a partir del `Content-Type` recibido; cualquier
  otro tipo se rechaza con un error de validación antes de guardar nada (FR-018).
- Se puede crear un `ArchivoEstudio` tanto si la `Cita` está `EN_CURSO` como si está
  `FINALIZADA` (FR-017) — es la única escritura que ignora el bloqueo de `Cita.estado`.
- Crear un `ArchivoEstudio` requiere conexión (no pasa por el outbox, research.md #5); no
  existe una versión offline de esta operación.
- Un `EstudioItem` puede tener cero, uno o varios `ArchivoEstudio` asociados (spec User
  Story 8, escenario 2).

### Metadata sincronizada (cliente, dentro del snapshot de `Cita` en Dexie)

Para que el historial de citas anteriores pueda mostrar sin conexión cuántos archivos tiene
cada estudio (aunque no pueda abrirlos sin conexión — research.md #14), el `GET` de una
`Cita` incluye, junto a cada `EstudioItem`, la metadata liviana de sus archivos (sin
`contenido`):

```jsonc
// Fragmento de la respuesta de GET /api/citas/:id (contracts/citas-api.md)
"estudioItems": [
  {
    "id": "…",
    "nombre": "Radiografía panorámica",
    "archivos": [
      { "id": "…", "nombreArchivo": "radiografia.jpg", "tipo": "IMAGEN", "createdAt": "…" }
    ]
  }
]
```

Esa forma combinada (`EstudioItem` + su lista de metadata de archivos) es lo que se
persiste en `db.citas` de Dexie — el dominio `EstudioItem` en el cliente incluye este campo
derivado `archivos`, aunque en PostgreSQL viven en la tabla separada `ArchivoEstudio`
(research.md #3).

## OutboxOperation (modificado — cliente, Dexie)

Ya definido en `001-gestion-pacientes` y generalizado en `004-consultorios`. Se extiende a
una tercera entidad (research.md #8):

| Campo | Antes (004) | Ahora | Notas |
|---|---|---|---|
| `entidad` | `"PACIENTE" \| "CONSULTORIO"` | **`"PACIENTE" \| "CONSULTORIO" \| "CITA"`** | Nuevo valor — mismo discriminador, sin cambios de forma. |
| `tipo` | según entidad | para `CITA`: `"CREAR"`, `"EDITAR"`, `"FINALIZAR"` (nuevo valor) | `CITA` no usa `"ARCHIVAR"`/`"REACTIVAR"` (esos son exclusivos de `Paciente`). |
| `baseVersion` | opcional, usado por `PACIENTE`/`EDITAR` | también usado por `CITA`/`EDITAR` | Mismo mecanismo de conflicto (research.md #7). |
| `payload`, `id`, `estado`, `createdAt` | — | sin cambios | Misma mecánica de cola para las tres entidades. |

Las operaciones sobre `ArchivoEstudio` (subir un archivo) **no** pasan por
`OutboxOperation` — son una llamada directa al servidor (research.md #5), fuera de este
mecanismo por diseño.

## Paciente (sin cambios de forma)

Esta feature no agrega columnas a `Paciente` — solo agrega la relación inversa implícita
`Paciente.citas: Cita[]` a nivel de Prisma (sin campo nuevo visible en el dominio
`Paciente`). El botón "Nueva cita" / "Atender paciente" solo se habilita cuando
`puedeEditarse(paciente)` (ya definida en `001-gestion-pacientes`) es `true` (FR-001).

## Relaciones (resumen)

- `Cita.pacienteId` → `Paciente.id` (muchos a uno, obligatorio).
- `ArchivoEstudio.citaId` → `Cita.id` (muchos a uno, obligatorio, `onDelete: Cascade`).
- `ArchivoEstudio.estudioItemId` → `id` de un elemento dentro de `Cita.estudioItems`
  (validado en la capa de aplicación, no una FK de base de datos).
- `OutboxOperation.entidadId` → `Paciente.id`, `Consultorio.id` **o** `Cita.id`, según
  `OutboxOperation.entidad`.
- No hay relación entre `Cita` y `Consultorio` (evaluado y descartado explícitamente, spec
  Assumptions).
