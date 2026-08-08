---

description: "Task list for Consultorios (clasificación de pacientes por sede) (004-consultorios)"
---

# Tasks: Consultorios (clasificación de pacientes por sede)

**Input**: Design documents from `/specs/004-consultorios/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige tests que fallen, escritos antes del código de implementación. Cada
fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota sobre alcance**: esta feature extiende `001-gestion-pacientes` (entidad `Paciente`,
motor de sync) y reutiliza componentes de UI ya existentes (`Select`, `Card`, `Input`,
`Button`, `Alert` — ver `docs/design-system.md` §6). No agrega dependencias ni tooling
nuevo — la numeración de tareas empieza directamente en Foundational, sin fase de Setup
propia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/components/`, `src/app/`, `prisma/`,
`tests/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Entidad `Consultorio` (dominio, Prisma, Dexie), el campo `consultorioId` en
`Paciente`, y la generalización del motor de sync (outbox + `/api/sync` + pull) para que
pueda llevar operaciones de más de una entidad (research.md #1). Ninguna historia de
usuario puede demostrarse sin esto — incluso US1 por sí sola exige que crear/eliminar un
consultorio funcione offline y sincronice (FR-011, FR-012).

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T001 Migración de Prisma en `prisma/schema.prisma`: modelo `Consultorio` (`id`,
  `nombre`, `nombreNormalizado String @unique`, `createdAt`) y columna
  `Paciente.consultorioId String?` con relación `onDelete: SetNull` hacia `Consultorio`
  (`data-model.md`, research.md #4, #6). Aplicar con `npx prisma migrate dev` contra una
  base real — aditiva, sin backfill necesario (campo nuevo nullable).
- [X] T002 [P] Crear la entidad de dominio `Consultorio` (`id`, `nombre`, `createdAt` —
  sin `nombreNormalizado`, que es un detalle exclusivo de Prisma) en
  `src/domain/entities/Consultorio.ts`.
- [X] T003 [P] Agregar `consultorioId: string | null` a `Paciente` y a
  `DatosNuevoPaciente` (default `null` en `crearPacienteDesdeDatos`) en
  `src/domain/entities/Paciente.ts`.
- [X] T004 [P] Agregar `NombreConsultorioDuplicadoError` (FR-003) en `src/domain/errors.ts`,
  mismo patrón que `DocumentoDuplicadoError`.
- [X] T005 Crear la interfaz `IConsultorioRepository` (`crear`, `listar`, `obtenerPorId`,
  `eliminar`) en `src/domain/repositories/IConsultorioRepository.ts` (depende de T002).
- [X] T006 [P] Agregar `consultorioId?: string | null` a `DatosEdicionPaciente` en
  `src/domain/repositories/IPacienteRepository.ts` (depende de T003).
- [X] T007 [P] Crear `crearConsultorioInputSchema` (Zod: `nombre` no vacío) en
  `src/application/dto/consultorioDto.ts`.
- [X] T008 [P] Agregar `consultorioId: z.string().uuid().nullable().optional()` a
  `crearPacienteInputSchema` (y por herencia `editarPacienteInputSchema`) en
  `src/application/dto/pacienteDto.ts`.
- [X] T009 Generalizar `operacionSyncSchema` en `src/application/dto/syncDto.ts` a una
  unión discriminada por `entidad`: `PACIENTE` (`entidadId`, `tipo` existente,
  `baseVersion` obligatorio) y `CONSULTORIO` (`entidadId`, `tipo: "CREAR" | "ELIMINAR"`,
  sin `baseVersion`) — `contracts/consultorios-api.md`.
- [X] T010 Generalizar `OutboxOperation` en `src/infrastructure/db/dexie/db.ts`: renombrar
  `pacienteId` a `entidadId`, agregar `entidad: "PACIENTE" | "CONSULTORIO"`, volver
  `baseVersion` opcional, agregar tabla `consultorios: Table<Consultorio, string>` (bump de
  versión Dexie, aditivo) (depende de T002, data-model.md §OutboxOperation).
- [X] T011 Generalizar `outboxQueue.ts` (`encolarOperacion` recibe `entidad`+`entidadId`
  genéricos; el resto de las funciones de cola no cambian, ya que no dependían del tipo de
  entidad) en `src/infrastructure/sync/outboxQueue.ts` (depende de T010).
- [X] T012 Implementar `ConsultorioRepositoryDexie` (`crear`: valida nombre único local,
  encola `CREAR`; `listar`: ordenado por nombre; `eliminar`: idempotente, anula
  `consultorioId` en los pacientes locales que lo referencian antes de borrar, encola
  `ELIMINAR` — research.md #6) en
  `src/infrastructure/db/dexie/ConsultorioRepositoryDexie.ts` (depende de T005, T011).
- [X] T013 [P] Mapear `consultorioId` en `crear()`/`editar()` de `PacienteRepositoryDexie`
  en `src/infrastructure/db/dexie/PacienteRepositoryDexie.ts` (depende de T006).
- [X] T014 Implementar `ConsultorioRepositoryPrisma` (`crear`: calcula
  `nombreNormalizado`, detecta duplicado antes de insertar; `listar`; `eliminar`:
  idempotente — `onDelete: SetNull` de Postgres resuelve la cascada) en
  `src/infrastructure/db/prisma/ConsultorioRepositoryPrisma.ts` (depende de T001, T005).
- [X] T015 [P] Mapear `consultorioId` en `aDominio`/`crear`/`editar` de
  `PacienteRepositoryPrisma` en `src/infrastructure/db/prisma/PacienteRepositoryPrisma.ts`
  (depende de T001, T006).
- [X] T016 Implementar `GET /api/consultorios` en `src/app/api/consultorios/route.ts` per
  `contracts/consultorios-api.md` (depende de T014).
- [X] T017 Extender `POST /api/sync` en `src/app/api/sync/route.ts`: despachar por
  `entidad` — `PACIENTE` usa el aplicador ya existente; `CONSULTORIO` usa un aplicador
  nuevo (`CREAR` → `RECHAZADO`/`NOMBRE_DUPLICADO` si ya existe; `ELIMINAR` → idempotente)
  per `contracts/consultorios-api.md` (depende de T009, T014).
- [X] T018 Extender `syncEngine.ts`: `sincronizarLote` envía/aplica resultados por
  `entidad` genérica (`db.pacientes.put` o `db.consultorios.put`/`delete` según
  corresponda); agregar `pullConsultoriosDesdeServidor()` (pull completo desde
  `GET /api/consultorios` + reconciliación: upsert y borrado local con cascada a
  `consultorioId` de pacientes locales, research.md #5, #6), invocada desde
  `ejecutarCicloDeSync` en `src/infrastructure/sync/syncEngine.ts` (depende de T012, T016,
  T017).

**Checkpoint**: Con Foundational completo, `Consultorio` existe de punta a punta
(dominio → Dexie → Prisma → API → sync) y `Paciente` sabe llevar un `consultorioId` — las
historias de usuario pueden empezar.

---

## Phase 2: User Story 1 - Administrar la lista de consultorios (Priority: P1) 🎯 MVP

**Goal**: Crear y eliminar consultorios desde Configuración, con nombre único y
funcionamiento offline (FR-001 a FR-004, FR-011, FR-012).

**Independent Test**: Desde Configuración, crear un consultorio y verificar que aparece;
intentar uno con nombre repetido y verificar el rechazo; eliminar uno y verificar que
desaparece (Escenario 1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

- [X] T019 [P] [US1] Test unitario de `crearConsultorio` (nombre vacío rechazado, nombre
  duplicado insensible a mayúsculas rechazado, nombre válido persiste) en
  `tests/unit/crearConsultorio.test.ts`.
- [X] T020 [P] [US1] Test unitario de `eliminarConsultorio` (idempotente si ya no existe;
  anula `consultorioId` de los pacientes que lo referenciaban) en
  `tests/unit/eliminarConsultorio.test.ts`.
- [X] T021 [P] [US1] Test de integración de `GET /api/consultorios` y `POST /api/sync`
  para operaciones `CONSULTORIO` (`CREAR` exitoso, `CREAR` con `NOMBRE_DUPLICADO`,
  `ELIMINAR` idempotente) per `contracts/consultorios-api.md` en
  `tests/integration/consultorios.test.ts`.
- [X] T022 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` (agregar, rechazo de
  duplicado, eliminar) en `tests/e2e/consultorios-configuracion.spec.ts`.

### Implementation for User Story 1

- [X] T023 [US1] Implementar el caso de uso `crearConsultorio` en
  `src/application/use-cases/crearConsultorio.ts` (valida con Zod, usa
  `IConsultorioRepository`) (depende de T002, T005, T007, T012, T014).
- [X] T024 [US1] Implementar el caso de uso `eliminarConsultorio` en
  `src/application/use-cases/eliminarConsultorio.ts` (depende de T005, T012, T014).
- [X] T025 [US1] Agregar la sección "Consultorios" en
  `src/app/(shell)/configuracion/page.tsx`: lista reactiva (`useLiveQuery` contra Dexie,
  local-first), formulario de alta (`Input` + `Button`), botón eliminar por fila, aviso de
  duplicado (`Alert`) — reutiliza componentes existentes, sin UI nueva (depende de T023,
  T024).

**Checkpoint**: US1 funcional de punta a punta, incluso sin conexión — la odontóloga ya
puede armar su lista de consultorios.

---

## Phase 3: User Story 2 - Asignar un consultorio a un paciente (Priority: P2)

**Goal**: Selector opcional de consultorio en el alta y edición de paciente (FR-006 a
FR-009).

**Independent Test**: Con consultorios ya creados, dar de alta un paciente asignándole
uno; editarlo para cambiarlo o quitarlo; con una cuenta sin consultorios, confirmar que el
alta/edición sigue funcionando sin exigir ninguno (Escenario 2 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T026 [P] [US2] Test unitario: `crearPaciente`/`editarPaciente` aceptan
  `consultorioId` opcional (válido, `null`, formato inválido rechazado por Zod) —
  extender `tests/unit/crearPaciente.test.ts` y `tests/unit/editarPaciente.test.ts`.
- [X] T027 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` (alta con consultorio
  asignado, edición que lo cambia/quita, alta sin ningún consultorio creado) en
  `tests/e2e/consultorio-paciente-formulario.spec.ts`.

### Implementation for User Story 2

- [X] T028 [US2] Agregar `consultorioId` a `ValoresPacienteFormulario`/
  `DatosEnviadosPacienteFormulario` y un `Select` "Consultorio" (opcional, recibe la
  lista de consultorios como prop, incluye la opción "Sin consultorio") en
  `src/components/pacientes/PacienteFormulario.tsx` (depende de T008).
- [X] T029 [US2] Cargar la lista de consultorios (`useLiveQuery` contra Dexie) y pasarla a
  `PacienteFormulario` en `src/app/(shell)/pacientes/nuevo/page.tsx` (depende de T012,
  T028).
- [X] T030 [US2] Igual en la edición: cargar consultorios y el `consultorioId` inicial del
  paciente, pasarlos a `PacienteFormulario` en `src/app/(shell)/pacientes/[id]/page.tsx`
  (depende de T012, T028).

**Checkpoint**: US1 y US2 funcionan juntas — se puede armar la lista y asignarla a
pacientes nuevos y existentes.

---

## Phase 4: User Story 3 - Ver el consultorio de cada paciente en el listado (Priority: P3)

**Goal**: Columna "Consultorio" en el listado de pacientes, con indicación explícita
cuando no tiene ninguno asignado (FR-005, FR-010).

**Independent Test**: Con pacientes en distintos consultorios (y alguno sin ninguno),
verificar que el listado muestra el nombre correcto por fila; eliminar un consultorio con
pacientes asignados y verificar que esas filas pasan a "Sin consultorio" (Escenario 3 de
`quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T031 [P] [US3] Test e2e del Escenario 3 de `quickstart.md` (columna muestra el
  consultorio correcto; tras eliminarlo, la fila muestra "Sin consultorio" sin afectar el
  resto de la ficha) en `tests/e2e/consultorio-listado.spec.ts`.

### Implementation for User Story 3

- [X] T032 [US3] Agregar la columna "Consultorio" a la tabla de
  `src/app/(shell)/pacientes/page.tsx`: carga la lista de consultorios (`useLiveQuery`),
  resuelve `consultorioId → nombre` en un mapa construido una vez por render (sin N+1,
  research.md #7), muestra "Sin consultorio" cuando es `null` (depende de T012).

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente y en
conjunto.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final transversal, incluida la sincronización entre
dispositivos que motivó la extensión del motor de sync.

- [X] T033 [P] Test e2e del Escenario 4 de `quickstart.md` (crear/asignar un consultorio
  offline y verificar que llega al servidor; un segundo contexto de navegador ve el
  consultorio nuevo tras sincronizar; eliminarlo desde ahí y verificar la cascada a
  `null` en el primer dispositivo; nombre duplicado creado en dos dispositivos offline no
  se pierde en silencio) en `tests/e2e/consultorio-sync.spec.ts`.
- [X] T034 [P] Correr los 4 escenarios de `quickstart.md` de punta a punta manualmente.
- [X] T035 [P] Verificar el selector de consultorio (formulario) y la columna nueva
  (listado) en los tres breakpoints de `docs/design-system.md` §4.0 — Principio VI.
- [X] T036 `tsc --noEmit` y `eslint` limpios en todos los archivos nuevos/modificados de
  este feature.
- [X] T037 [P] Revisar que un `NOMBRE_DUPLICADO` detectado durante la sincronización
  nunca se descarta en silencio (Principio III): la operación queda visible/marcada en el
  outbox local del dispositivo que lo generó, no simplemente desaparece.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Sin dependencias externas — BLOQUEA todas las historias de
  usuario.
- **Historias de usuario (Phase 2+)**: Todas dependen de Foundational.
  - US1 no depende de US2 ni US3.
  - US2 depende de que existan consultorios para asignar de forma útil, pero el
    formulario en sí (Select + wiring) se puede construir en paralelo a US1 — su prueba
    independiente solo necesita **algún** consultorio ya creado (a mano, vía Dexie, o
    tras completar US1).
  - US3 depende de US1 (consultorios existentes) y US2 (pacientes con `consultorioId`
    asignado) para tener datos que mostrar, pero su propio código (columna + resolución
    de nombre) es independiente de ambos.
- **Polish (Phase 5)**: Depende de que las 3 historias estén completas.

### Dentro de cada historia

- Tests (obligatorios) se escriben y deben fallar antes de implementar.
- Entidad/repositorio (Foundational) antes que caso de uso.
- Caso de uso antes que la UI que lo consume.

### Oportunidades de paralelismo

- T002, T003, T004 (Foundational) en paralelo desde el inicio.
- T013 y T015 (mapear `consultorioId` en Dexie/Prisma de `Paciente`) en paralelo entre sí.
- Los 4 tests de US1 (T019-T022) en paralelo.
- Los 2 tests de US2 (T026-T027) en paralelo.
- US2 (T028-T030) puede avanzar en paralelo a US1 una vez completado Foundational, ya que
  toca archivos distintos (`PacienteFormulario.tsx`, páginas de alta/edición) — solo su
  prueba end-to-end completa espera a que haya al menos un consultorio creado.

---

## Parallel Example: Foundational

```bash
# Al inicio de Foundational, lanzar juntas:
Task: "Crear la entidad de dominio Consultorio (T002)"
Task: "Agregar consultorioId a Paciente (T003)"
Task: "Agregar NombreConsultorioDuplicadoError (T004)"
```

## Parallel Example: User Story 1

```bash
# Los 4 tests de US1 no comparten archivo — lanzar juntos:
Task: "Test unitario de crearConsultorio (T019)"
Task: "Test unitario de eliminarConsultorio (T020)"
Task: "Test de integración de consultorios (T021)"
Task: "Test e2e del Escenario 1 (T022)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Foundational (crítico — bloquea todo, incluye la extensión del
   motor de sync)
2. Completar Phase 2: User Story 1
3. **Detener y validar**: probar US1 de forma independiente (Escenario 1 de
   `quickstart.md`), incluido el caso offline
4. La odontóloga ya puede armar su lista de consultorios, aunque todavía no se pueda
   asignar a pacientes ni verse en el listado

### Entrega incremental

1. Foundational → base lista (incluye la generalización del motor de sync)
2. US1 → validar → demo (MVP: lista de consultorios administrable)
3. US2 → validar → demo (asignación en el formulario de paciente)
4. US3 → validar → demo (columna en el listado)
5. Polish → validación de punta a punta, incluida sincronización entre dispositivos

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- Verificar que los tests fallan antes de implementar.
- Commit después de cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
- Evitar: tareas vagas, conflictos de archivo entre historias, dependencias cruzadas que
  rompan la independencia de cada historia.
