---

description: "Task list for Gestión de Insumos (010-gestion-insumos)"
---

# Tasks: Gestión de Insumos (Control de Stock de Materiales)

**Input**: Design documents from `/specs/010-gestion-insumos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — Principio I de la constitución (Test-First,
NON-NEGOTIABLE), igual que en `001-gestion-pacientes`. Cada fase de historia de usuario
incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota de alcance**: esta feature reutiliza infraestructura ya construida en
`001-gestion-pacientes` (Next.js, Auth.js, Vitest/Playwright, Dexie, Prisma, el propio
outbox/sync engine). El Sidebar y el placeholder de `/insumos` ya existen (`002-pantalla-inicio`)
— no hay tareas de Setup de proyecto desde cero, solo las específicas de `Insumo` y la
extensión puntual del outbox descrita en `research.md` #2.

**⚠️ Hallazgo durante la implementación (invalida parte del plan original)**: el outbox
**ya estaba generalizado** por `entidad`/`entidadId` desde `004-consultorios` (research.md
#1 de esa feature), y hoy transporta 6 entidades, no solo `Paciente`. En consecuencia:
- T003 y T011 (renombrar `pacienteId` → `entidadId` y migrar los datos de IndexedDB) **no
  aplican**: ese trabajo ya está hecho desde la v4 del esquema Dexie.
- T012 (`outboxQueue`) **no requirió ningún cambio**: `encolarOperacion` ya recibe `entidad`.
- Lo único necesario fue **agregar `"INSUMO"`** al union `EntidadOutbox` y un schema Zod
  nuevo al discriminated union de `syncDto.ts`.
- T057 (regresión por el renombre) pierde su motivo original, pero se ejecutó igual como
  verificación de que agregar una séptima entidad no rompe las seis anteriores.

`contracts/sync-api-delta.md` describe un cambio de contrato que en la práctica ya existía;
queda como documentación de lo que Insumo agrega (el campo `insumo` en los resultados).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1–US5)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js que Pacientes (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/app/(shell)/`, `prisma/`, `tests/`.

---

## Phase 1: Setup

**Purpose**: Confirmar que no hace falta inicialización nueva de proyecto — todo el stack
(Next.js, Prisma, Dexie, Auth.js, Zod, Vitest, Playwright) ya está instalado y configurado
desde `001-gestion-pacientes`.

- [X] T001 Confirmar que `package.json` no requiere dependencias nuevas para esta feature
  (research.md #1) y que `npm run lint` / `npx tsc --noEmit` corren limpios sobre el estado
  actual del repo antes de empezar (línea base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que TODAS las historias de usuario necesitan —
esquema de datos de `Insumo`, extensión del outbox/sync para transportar ambas entidades,
repositorios (servidor y local-first) y protección de rutas. Corresponde a `research.md` y
`data-model.md`.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T002 Agregar `model Insumo` y `enum EstadoInsumo` a `prisma/schema.prisma` per
  `data-model.md` (`id`, `nombre`, `categoria`, `stockActual`, `stockMinimo`, `estado`,
  `version`, `conflictoPendiente`, `createdAt`, `updatedAt`)
- [X] ~~T003 Modificar `OutboxOperation` en `prisma/schema.prisma`~~ — **NO APLICA**: el
  outbox nunca fue una tabla de Postgres (vive solo en Dexie, `data-model.md` de
  `001-gestion-pacientes`), y su generalización a `entidad`/`entidadId` ya la hizo
  `004-consultorios`. Lo único hecho acá: agregar `"INSUMO"` al union `EntidadOutbox` en
  `src/infrastructure/db/dexie/db.ts` y el schema `operacionSyncInsumoSchema` en
  `src/application/dto/syncDto.ts`
- [X] T004 Generar y aplicar la migración de Prisma para T002 — aplicada como
  `prisma/migrations/20260807034556_agregar_insumos/` (`CREATE TYPE "EstadoInsumo"` +
  `CREATE TABLE "Insumo"` + índice por `estado`). Puramente aditiva: no altera ninguna tabla
  existente. `npx prisma generate` corrido después, limpio
- [X] T005 [P] Crear entidad de dominio `Insumo` (sin dependencias de framework, incluye
  helper `calcularAReponer(stockActual, stockMinimo)` per research.md #4) en
  `src/domain/entities/Insumo.ts`
- [X] T006 Crear interfaz `IInsumoRepository` (crear, buscar, obtenerPorId, editar, archivar,
  reactivar) en `src/domain/repositories/IInsumoRepository.ts` (depende de T005)
- [X] T007 [P] Definir esquemas Zod de validación (`crearInsumoInput`, `editarInsumoInput`,
  `buscarInsumosQuery` con `q`/`categoria`/`aReponer`/`estado`/`pagina`/`limite`/`desde`) en
  `src/application/dto/insumoDto.ts` per `contracts/insumos-api.md`
- [X] T008 Implementar `InsumoRepositoryPrisma` en
  `src/infrastructure/db/prisma/InsumoRepositoryPrisma.ts` — consultas parametrizadas
  (Principio VII), `select`/`include` explícito (Principio VIII), calcula `aReponer` en cada
  lectura (research.md #4) (depende de T004, T006)
- [X] T009 [P] Extender el esquema Dexie con la tabla `insumos` en
  `src/infrastructure/db/dexie/db.ts` (depende de T005)
- [X] T010 Implementar `InsumoRepositoryDexie` en
  `src/infrastructure/db/dexie/InsumoRepositoryDexie.ts` — cada escritura local encola
  automáticamente una `OutboxOperation` con `entidad: "INSUMO"` (depende de T006, T009)
- [X] ~~T011 Migrar las entradas existentes de `outboxOperations` en IndexedDB~~ — **NO
  APLICA**: ya lo hace el `upgrade()` de la v4 del esquema Dexie (`004-consultorios`). Acá
  solo se agregó la v7 con la tabla `insumos`, aditiva y sin `upgrade()`
- [X] ~~T012 Actualizar `src/infrastructure/sync/outboxQueue.ts`~~ — **SIN CAMBIOS**:
  `encolarOperacion(entidad, entidadId, tipo, payload, baseVersion)` ya era genérica desde
  `004-consultorios`; `InsumoRepositoryDexie` la usa tal cual
- [X] T013 Actualizar `src/infrastructure/sync/syncEngine.ts`: el push agrupa el lote por
  `entidad` antes de aplicarlo, y el pull (`pullCambiosDesdeServidor`, ver
  `001-gestion-pacientes/tasks.md` T014) se extiende para también traer `Insumo` vía
  `GET /api/insumos?estado=TODOS` (depende de T008, T012)
- [X] T014 Actualizar `POST /api/sync` en `src/app/api/sync/route.ts` per
  `contracts/sync-api-delta.md` — despacha cada operación del lote contra
  `PacienteRepositoryPrisma` o `InsumoRepositoryPrisma` según `entidad`, misma idempotencia y
  manejo de conflicto que antes (depende de T008, T013)
- [X] T015 Extender `src/middleware.ts` para exigir sesión válida también en
  `/api/insumos/*` (Principios IV y VII) (depende de infraestructura de Auth.js existente de
  `001-gestion-pacientes`)
- [X] T016 Reemplazar el placeholder `src/app/(shell)/insumos/page.tsx` (actualmente un
  `Alert` "próximamente") dejando el archivo listo para la implementación real de US1–US3
  (elimina el contenido placeholder, conserva la ruta)

**Checkpoint**: Con Foundational completo, cualquier historia de usuario puede empezar —
todas comparten el mismo repositorio local-first, el outbox/sync extendido y acceso
autenticado, sin reimplementarlo. La sincronización de Pacientes sigue funcionando (T011,
T013, T014 no cambian su comportamiento observable para `Paciente`).

---

## Phase 3: User Story 1 - Registrar un insumo nuevo (Priority: P1) 🎯 MVP

**Goal**: Crear un insumo con nombre, categoría, stock actual y stock mínimo, validando
campos obligatorios y valores no negativos (FR-001 a FR-003).

**Independent Test**: Crear un insumo con datos válidos y verificar que queda guardado y
visible en el listado; intentar guardar sin campos obligatorios o con stock negativo y
verificar el bloqueo (Escenario 1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

> Escribir estos tests primero y confirmar que fallan antes de implementar.

- [X] T017 [P] [US1] Test unitario de `crearInsumo` (campos obligatorios, stock ≥ 0 y
  entero) en `tests/unit/crearInsumo.test.ts`
- [X] T018 [P] [US1] Test de integración de `POST /api/insumos` (201, 422 validación) per
  `contracts/insumos-api.md` en `tests/integration/insumos-create.test.ts`
- [X] T019 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` en
  `tests/e2e/insumos-gestion.spec.ts` — **escrito, no ejecutado**: los 5 escenarios se
  unificaron en un solo spec (los flujos comparten helpers de alta/búsqueda); requiere
  PostgreSQL con la migración de T004 aplicada y `npm run dev` corriendo

### Implementation for User Story 1

- [X] T020 [US1] Implementar caso de uso `crearInsumo` en
  `src/application/use-cases/crearInsumo.ts` (valida con Zod, delega al repositorio;
  depende de T005, T006, T007, T008, T010)
- [X] T021 [US1] Implementar `POST /api/insumos` en `src/app/api/insumos/route.ts` per
  `contracts/insumos-api.md` (depende de T020)
- [X] T022 [US1] Implementar flujo de creación local-first (UUID generado en cliente,
  escribe en Dexie + encola outbox) en `src/app/(shell)/insumos/nuevo/page.tsx` (depende de
  T010, T012)
- [X] T023 [US1] Construir formulario de alta (`InsumoFormulario`, reutilizable entre alta y
  edición, mismo patrón que `PacienteFormulario`) en `src/components/insumos/InsumoFormulario.tsx`
  con los componentes `Input`/`Button`/`Card`/`Alert` del design system
- [X] T024 [US1] Conectar validación y mensajes de error en la UI (campos obligatorios,
  stock negativo) en `InsumoFormulario.tsx`
- [X] T025 [US1] Construir listado mínimo (sin resaltado ni búsqueda todavía, solo tabla +
  columnas Nombre/Categoría/Stock actual/Stock mínimo) en
  `src/app/(shell)/insumos/page.tsx`, con botón "Nuevo insumo" en `TopAppBar`
  (`newItemButton={{ label: "Nuevo insumo", href: "/insumos/nuevo" }}`) — necesario para que
  US1 sea demostrable de punta a punta; US2 y US3 amplían este mismo archivo

**Checkpoint**: US1 funcional de punta a punta, incluso sin conexión (gracias a
Foundational).

---

## Phase 4: User Story 2 - Ver qué insumos deben reponerse (Priority: P2)

**Goal**: Resaltar visualmente en el listado los insumos activos con `stockActual <=
stockMinimo` y mostrar su conteo en la pantalla de Inicio (FR-004 a FR-006).

**Independent Test**: Cargar insumos con distinto stock, verificar el resaltado de los que
están en o por debajo del mínimo y el conteo correcto en Inicio; subir el stock de uno y
verificar que deja de resaltarse y baja el conteo (Escenario 2 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T026 [P] [US2] Test unitario del cálculo `aReponer` (stock igual, menor y mayor al
  mínimo; mínimo en cero) en `tests/unit/insumoAReponer.test.ts`
- [X] T027 [P] [US2] Test de integración de `GET /api/insumos?aReponer=true` (excluye
  archivados) en `tests/integration/insumos-a-reponer.test.ts`
- [X] T028 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` — en
  `tests/e2e/insumos-gestion.spec.ts` (ver T019), **escrito, no ejecutado**

### Implementation for User Story 2

- [X] T029 [US2] Implementar caso de uso `buscarInsumos` (con soporte de filtro `aReponer`)
  en `src/application/use-cases/buscarInsumos.ts` (depende de T006, T008, T010)
- [X] T030 [US2] Implementar `GET /api/insumos` en `src/app/api/insumos/route.ts` per
  `contracts/insumos-api.md` (mismo archivo que T021 — depende de T021, T029)
- [X] T031 [US2] Agregar resaltado visual (badge/color de advertencia, reutilizando el token
  semántico existente per research.md #6) a la fila de insumos "a reponer" en
  `src/app/(shell)/insumos/page.tsx` (depende de T025)
- [X] T032 [US2] Agregar tarjeta `MetricaCard` "Insumos a reponer" (mismo componente que
  "Total Pacientes"/"Citas Hoy") en la pantalla de Inicio, consultando Dexie localmente per
  research.md #7, en `src/app/(shell)/page.tsx`

**Checkpoint**: US1 y US2 funcionan juntas — el listado ya muestra qué reponer y la pantalla
de Inicio lo resume.

---

## Phase 5: User Story 3 - Buscar y filtrar insumos (Priority: P3)

**Goal**: Encontrar insumos por nombre (parcial) y filtrarlos por categoría, excluyendo
archivados por defecto (FR-008 a FR-010).

**Independent Test**: Con varios insumos en distintas categorías, buscar por nombre parcial
y filtrar por categoría y verificar resultados correctos; buscar algo sin coincidencias y ver
el estado vacío (Escenario 3 de `quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T033 [P] [US3] Test unitario de `buscarInsumos` (nombre parcial insensible a
  mayúsculas, filtro por categoría exacta, exclusión de archivados por defecto) en
  `tests/unit/buscarInsumos.test.ts` (extiende T029)
- [X] T034 [P] [US3] Test de integración de `GET /api/insumos` con `q` y `categoria` en
  `tests/integration/insumos-search.test.ts`
- [X] T035 [P] [US3] Test e2e del Escenario 3 de `quickstart.md` — en
  `tests/e2e/insumos-gestion.spec.ts` (ver T019), **escrito, no ejecutado**

### Implementation for User Story 3

- [X] T036 [US3] Extender `buscarInsumos` (T029) con `q` (nombre, coincidencia parcial) y
  `categoria` (exacta) en `src/application/use-cases/buscarInsumos.ts`
- [X] T037 [US3] Derivar la lista de categorías disponibles para el filtro a partir de los
  insumos activos existentes (`DISTINCT categoria`, research.md #5) en
  `InsumoRepositoryDexie.ts` / `InsumoRepositoryPrisma.ts`
- [X] T038 [US3] Construir barra de búsqueda (`Input`, debounce per Principio VIII) + filtro
  por categoría (`Select`) en `src/app/(shell)/insumos/page.tsx` (depende de T025, T037)
- [X] T039 [US3] Implementar estado vacío "sin resultados" (`Alert` info del design system)
  en la misma página

**Checkpoint**: US1, US2 y US3 funcionan juntas — listado, alertas de reposición y
búsqueda/filtro completos.

---

## Phase 6: User Story 4 - Editar y actualizar el stock de un insumo (Priority: P4)

**Goal**: Editar nombre/categoría/stock mínimo y actualizar el stock actual (reposición o
consumo) de un insumo activo; bloquear edición directa de uno archivado (FR-011, FR-012).

**Independent Test**: Editar el stock actual de un insumo activo y verificar que se recalcula
su estado "a reponer"; editar otros campos y verificar persistencia; intentar editar un
insumo archivado y verificar el bloqueo (Escenario 4 de `quickstart.md`, pasos 1 y 5).

### Tests for User Story 4 (obligatorios) ⚠️

- [X] T040 [P] [US4] Test unitario de `editarInsumo` (actualiza stock y recalcula
  `aReponer`, rechaza edición si `estado = ARCHIVADO`) en `tests/unit/editarInsumo.test.ts`
- [X] T041 [P] [US4] Test de integración de `PUT /api/insumos/:id` (200, 409
  `INSUMO_ARCHIVADO`, 409 `CONFLICTO_VERSION`, 422) per `contracts/insumos-api.md` en
  `tests/integration/insumos-edit.test.ts`
- [X] T042 [P] [US4] Test e2e del Escenario 4 (pasos 1 y 5) — en
  `tests/e2e/insumos-gestion.spec.ts` (ver T019), **escrito, no ejecutado**

### Implementation for User Story 4

- [X] T043 [US4] Implementar caso de uso `editarInsumo` en
  `src/application/use-cases/editarInsumo.ts` (valida con Zod, recalcula `aReponer`,
  incrementa `version`, detecta conflicto; depende de T006, T007, T008, T010)
- [X] T044 [US4] Implementar `PUT /api/insumos/:id` en `src/app/api/insumos/[id]/route.ts`
  per `contracts/insumos-api.md` (depende de T043)
- [X] T045 [US4] Construir ficha/edición en `src/app/(shell)/insumos/[id]/page.tsx`
  reutilizando `InsumoFormulario` (T023) precargado con los datos actuales, incluido el
  campo de stock actual como edición directa (research.md #4, sin acciones separadas de
  "reponer"/"consumir")
- [X] T046 [US4] Bloquear edición en la UI cuando `estado = ARCHIVADO` (mensaje "reactivar
  primero", FR-012) en `src/app/(shell)/insumos/[id]/page.tsx`

**Checkpoint**: US1–US4 funcionan juntas — alta, alertas, búsqueda y edición completas.

---

## Phase 7: User Story 5 - Archivar un insumo que ya no se usa (Priority: P5)

**Goal**: Archivar (baja lógica) y reactivar un insumo, excluyéndolo del listado, búsqueda y
conteo de reposición por defecto mientras esté archivado (FR-013 a FR-015).

**Independent Test**: Archivar un insumo activo y verificar que desaparece del
listado/búsqueda/conteo por defecto pero es visible y recuperable en la vista de archivados;
reactivarlo y verificar que vuelve (Escenario 4, pasos 2–4 y 6, de `quickstart.md`).

### Tests for User Story 5 (obligatorios) ⚠️

- [X] T047 [P] [US5] Test unitario de `archivarInsumo`/`reactivarInsumo` (transición de
  estado, archivar-ya-archivado sin error) en `tests/unit/archivarInsumo.test.ts`
- [X] T048 [P] [US5] Test de integración de `POST /api/insumos/:id/archive` y
  `POST /api/insumos/:id/reactivate` per `contracts/insumos-api.md` en
  `tests/integration/insumos-archive.test.ts`
- [X] T049 [P] [US5] Test e2e del Escenario 4 (pasos 2–4 y 6) — en
  `tests/e2e/insumos-gestion.spec.ts` (ver T019), **escrito, no ejecutado**

### Implementation for User Story 5

- [X] T050 [P] [US5] Implementar casos de uso `archivarInsumo` y `reactivarInsumo` en
  `src/application/use-cases/archivarInsumo.ts` y
  `src/application/use-cases/reactivarInsumo.ts` (depende de T006, T008, T010)
- [X] T051 [US5] Implementar `POST /api/insumos/:id/archive` y
  `POST /api/insumos/:id/reactivate` en `src/app/api/insumos/[id]/archive/route.ts` y
  `src/app/api/insumos/[id]/reactivate/route.ts` per `contracts/insumos-api.md` (depende de
  T050)
- [X] T052 [US5] Agregar tabs "Activo" / "Archivado" al listado (mismo componente `Tabs` que
  Pacientes) en `src/app/(shell)/insumos/page.tsx` (depende de T025, T038)
- [X] T053 [US5] Agregar acción "Archivar" / "Reactivar" en la ficha de edición
  (`src/app/(shell)/insumos/[id]/page.tsx`, depende de T045, T051)
- [X] T054 [US5] Excluir insumos archivados del cálculo de "a reponer" (listado y tarjeta de
  Inicio) en `InsumoRepositoryDexie.ts` / `InsumoRepositoryPrisma.ts` (depende de T031, T032)

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente y en conjunto —
feature completa per `spec.md`.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación transversal, consistencia con Pacientes y validación de punta a
punta de la extensión de sync.

- [X] T055 [P] Verificar responsive (phone/tablet/desktop, Principio VI) — automatizado en
  `tests/e2e/insumos-responsive.spec.ts`: 7/7 pasan. Valida que ninguna pantalla requiera
  scroll horizontal en 375/834/1440px, y que en celular la tabla se reordene como tarjetas
  (thead oculto, cada celda etiquetada con `data-columna`)
- [ ] T056 [P] Test e2e del Escenario 5 de `quickstart.md` (offline con operaciones mixtas
  de Paciente e Insumo) en `tests/e2e/sync-offline-mixto.spec.ts` — **PENDIENTE**. El sync de
  Insumo sí quedó verificado de punta a punta (los 5 insumos creados por los e2e llegaron a
  PostgreSQL vía el outbox), y `tests/e2e/offline-sync.spec.ts` (Paciente) sigue pasando; lo
  que falta es el caso puntual de un mismo lote mezclando ambas entidades offline
- [X] T057 [P] Test de regresión de Pacientes: correr la suite existente de
  `001-gestion-pacientes` (`tests/unit`, `tests/integration`, `tests/e2e` relacionados a
  `Paciente`/`OutboxOperation`) para confirmar que el renombre `pacienteId` → `entidadId`
  (T003, T011) no rompió nada
- [X] T058 Ejecutar los escenarios de `quickstart.md` de punta a punta contra PostgreSQL
  real — Escenarios 1 a 4 cubiertos por `tests/e2e/insumos-gestion.spec.ts` (10/10 pasan).
  Verificado además en la base: 5 insumos sincronizados, con estado y stock correctos.
  Escenario 5 (offline mixto) parcialmente cubierto — ver T056
- [X] T059 [P] Revisar `docs/design-system.md` por si el resaltado "a reponer" (T031)
  requirió documentar un uso nuevo de un token existente (research.md #6) y actualizarlo si
  corresponde

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias de usuario
- **User Stories (Phase 3-7)**: todas dependen de que Foundational esté completo
  - Pueden avanzar en paralelo (si hay más de un desarrollador) o en orden de prioridad
    (P1 → P2 → P3 → P4 → P5)
  - US2 y US3 modifican el mismo archivo que crea US1 (`insumos/page.tsx`) — no son
    paralelizables entre sí a nivel de archivo, aunque sí lo son a nivel de lógica de negocio
    (`buscarInsumos.ts` vs. resaltado visual)
- **Polish (Phase 8)**: depende de que todas las historias deseadas estén completas

### User Story Dependencies

- **US1 (P1)**: puede empezar después de Foundational — sin dependencia de otras historias
- **US2 (P2)**: puede empezar después de Foundational; reutiliza `insumos/page.tsx` de US1
  (mismo archivo, no bloqueante de lógica)
- **US3 (P3)**: idem US2 — reutiliza `insumos/page.tsx` y extiende `buscarInsumos` de US2
- **US4 (P4)**: puede empezar después de Foundational; reutiliza `InsumoFormulario` de US1
- **US5 (P5)**: puede empezar después de Foundational; agrega tabs sobre `insumos/page.tsx`
  y una acción sobre la ficha de US4

### Within Each User Story

- Tests primero, deben fallar antes de implementar (Principio I)
- Entidad/dominio antes que casos de uso
- Casos de uso antes que rutas de API
- API antes que UI que la consume
- Historia completa y verificada antes de pasar a la siguiente prioridad

### Parallel Opportunities

- T005, T007, T009 (Foundational, marcadas [P]) en paralelo
- Todos los tests marcados [P] dentro de una misma historia, en paralelo
- T050 (US5, ambos casos de uso) en paralelo
- Distintas historias de usuario pueden trabajarse en paralelo por distintas personas después
  de Foundational, con la salvedad de `insumos/page.tsx` compartido entre US1/US2/US3/US5
  (coordinar merges)

---

## Parallel Example: Foundational

```bash
Task: "Crear entidad de dominio Insumo en src/domain/entities/Insumo.ts"
Task: "Definir esquemas Zod en src/application/dto/insumoDto.ts"
Task: "Extender esquema Dexie con tabla insumos en src/infrastructure/db/dexie/db.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Test unitario de crearInsumo en tests/unit/crearInsumo.test.ts"
Task: "Test de integración de POST /api/insumos en tests/integration/insumos-create.test.ts"
Task: "Test e2e del Escenario 1 en tests/e2e/alta-insumo.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **Parar y VALIDAR**: probar US1 de forma independiente (Escenario 1 de `quickstart.md`)
5. Desplegar/demostrar si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → probar independientemente → demo (MVP)
3. + US2 → probar independientemente → demo (ya se ven las alertas de reposición)
4. + US3 → probar independientemente → demo (búsqueda/filtro)
5. + US4 → probar independientemente → demo (edición/actualización de stock)
6. + US5 → probar independientemente → demo (archivado) — feature completa

### Parallel Team Strategy

Con más de un desarrollador: completar Setup + Foundational en conjunto; luego repartir
US1–US5 entre personas, coordinando los cambios compartidos sobre `insumos/page.tsx`
(US1/US2/US3/US5) y `InsumoFormulario.tsx` (US1/US4).

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia debe quedar completable y probable de forma independiente
- Confirmar que los tests fallan antes de implementar
- Commitear después de cada tarea o grupo lógico
- Parar en cualquier checkpoint para validar la historia de forma aislada
- Evitar: tareas vagas, conflictos de archivo dentro de la misma tarea, dependencias
  cruzadas entre historias que rompan la independencia
