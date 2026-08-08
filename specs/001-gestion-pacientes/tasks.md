---

description: "Task list for Gestión de Pacientes (001-gestion-pacientes)"
---

# Tasks: Gestión de Pacientes (Ficha y Control Propio del Odontólogo)

**Input**: Design documents from `/specs/001-gestion-pacientes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige que cada feature tenga tests que fallen, escritos antes del código de
implementación. Cada fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota sobre login**: el mecanismo de autenticación en sí queda fuera del alcance del
*spec* (`spec.md` §Assumptions) — no es una historia de usuario de gestión de pacientes.
Pero sin una pantalla de login mínima no se puede entrar a probar nada, así que se agregó
como parte de Foundational (T018, T019) — es infraestructura compartida, no una historia
propia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único Next.js (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/app/`, `prisma/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js según `plan.md`

- [X] T001 Crear estructura de carpetas per plan.md (`src/domain`, `src/application`,
  `src/infrastructure`, `src/app`, `prisma`, `tests/{unit,integration,e2e}`)
- [X] T002 Inicializar proyecto Next.js 15 (App Router) + TypeScript 5.x con dependencias:
  `prisma`, `@prisma/client`, `dexie`, `next-auth`, `zod`, `bcryptjs` — en `package.json`
  (nota: `bcryptjs` en vez de `bcrypt` — mismo hash, sin compilación nativa en Windows)
- [X] T003 [P] Configurar ESLint + Prettier en `eslint.config.mjs` / `.prettierrc.json`
- [X] T004 [P] Configurar Vitest (unit/integration) en `vitest.config.ts` y Playwright
  (e2e) en `playwright.config.ts`
- [X] T005 [P] Crear `.env.example` con `DATABASE_URL` y variables de Auth.js
  (`AUTH_SECRET`, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que TODAS las historias de usuario necesitan —
esquema de datos, repositorios (servidor y local-first), sincronización, autenticación y
acceso mínimo a la app. Corresponde a las decisiones de `research.md` y a las entidades de
`data-model.md`.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T006 Definir modelo `Paciente` en `prisma/schema.prisma` (campos y constraint de
  unicidad de `documentoIdentidad` per `data-model.md`) y correr la migración inicial
  (`npx prisma migrate dev`) — schema listo; incluye también `Usuario` (cuenta única) y
  `OperacionSincronizada` (idempotencia de `/api/sync`, no prevista en data-model.md
  original pero necesaria para cumplir lo prometido en `contracts/sync-api.md`). Migración
  pendiente de correr contra una base real (requiere `DATABASE_URL`).
- [X] T007 [P] Crear entidad de dominio `Paciente` (sin dependencias de framework) en
  `src/domain/entities/Paciente.ts`
- [X] T008 Crear interfaz `IPacienteRepository` (crear, buscar, obtenerPorId, editar,
  archivar, reactivar) en `src/domain/repositories/IPacienteRepository.ts` (depende de T007)
- [X] T009 [P] Definir esquemas Zod de validación (`crearPacienteInput`,
  `editarPacienteInput`) en `src/application/dto/pacienteDto.ts`
- [X] T010 Implementar `PacienteRepositoryPrisma` en
  `src/infrastructure/db/prisma/PacienteRepositoryPrisma.ts` — consultas parametrizadas vía
  Prisma (Principio VII), `select`/`include` explícito (Principio VIII) (depende de T006,
  T008)
- [X] T011 [P] Definir esquema Dexie (tablas `pacientes` y `outboxOperations` per
  `data-model.md`) en `src/infrastructure/db/dexie/db.ts`
- [X] T012 Implementar `PacienteRepositoryDexie` en
  `src/infrastructure/db/dexie/PacienteRepositoryDexie.ts` — cada escritura local encola
  automáticamente una `OutboxOperation` (depende de T008, T011)
- [X] T013 Implementar `outboxQueue` (encolar / marcar SINCRONIZADO·CONFLICTO / limpiar) en
  `src/infrastructure/sync/outboxQueue.ts` (depende de T011)
- [X] T014 Implementar `syncEngine` (listener de evento `online`, lotes de ~20, clave de
  idempotencia, per `research.md` #4) en `src/infrastructure/sync/syncEngine.ts` (depende de
  T013). **Ampliado durante la implementación**: el diseño original de research.md/plan.md
  solo cubría "push" (cliente → servidor). Se detectó que sin "pull" (servidor → cliente)
  un paciente creado en un dispositivo nunca aparecería en los otros — se agregó
  `pullCambiosDesdeServidor()` (trae `GET /api/patients?estado=TODOS` y mezcla en Dexie sin
  pisar ediciones locales aún no sincronizadas), confirmado con el usuario antes de seguir.
  El motor arranca automáticamente en `src/app/providers.tsx`.
- [X] T015 Implementar `POST /api/sync` per `contracts/sync-api.md` (aplica operaciones,
  detecta conflicto de versión, nunca descarta una edición) en `src/app/api/sync/route.ts`
  (depende de T009, T010)
- [X] T016 [P] Configurar Auth.js (proveedor de credenciales, cuenta única, hash
  bcryptjs) en `src/infrastructure/auth/auth.config.ts` + ruta
  `src/app/api/auth/[...nextauth]/route.ts`
- [X] T017 Implementar middleware que exige sesión válida en toda ruta
  `/api/patients/*` y `/api/sync` en `src/middleware.ts` (depende de T016; Principios IV y
  VII)
- [X] T018 Crear script de seed para la cuenta única del odontólogo (email + contraseña
  hasheada, desde variables de entorno) en `prisma/seed.ts` (depende de T006, T016) — sin
  esto no hay con qué iniciar sesión
- [X] T019 Construir pantalla mínima de login (email/contraseña, usa Auth.js) en
  `src/app/login/page.tsx` — no es una historia de usuario del spec, es el acceso mínimo
  indispensable para poder probar cualquiera de las 4 historias (depende de T016)

**Checkpoint**: Con Foundational completo, cualquier historia de usuario puede empezar —
todas comparten el mismo repositorio local-first, motor de sync y acceso autenticado, sin
reimplementarlo.

---

## Phase 3: User Story 1 - Registrar un paciente nuevo (Priority: P1) 🎯 MVP

**Goal**: Crear una ficha de paciente con sus datos básicos, detectando duplicados por
documento de identidad (FR-001 a FR-004).

**Independent Test**: Crear una ficha con datos válidos y verificar que queda guardada y
buscable; intentar un documento duplicado y verificar el rechazo con aviso; intentar
guardar sin campos obligatorios y verificar el bloqueo (Escenario 1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

> Escribir estos tests primero y confirmar que fallan antes de implementar.

- [X] T020 [P] [US1] Test unitario de `crearPaciente` (campos obligatorios, unicidad de
  documento entre activos y archivados) en `tests/unit/crearPaciente.test.ts` — 6/6 pasan
- [X] T021 [P] [US1] Test de integración de `POST /api/patients` (201, 409
  `DOCUMENTO_DUPLICADO`, 422 validación) per `contracts/patients-api.md` en
  `tests/integration/patients-create.test.ts` — 3/3 pasan (mock de Prisma, sin DB real)
- [ ] T022 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` en
  `tests/e2e/alta-paciente.spec.ts` — **escrito, no ejecutado**: requiere PostgreSQL real,
  migración aplicada y `npm run dev` corriendo, no disponible en este entorno

### Implementation for User Story 1

- [X] T023 [US1] Implementar caso de uso `crearPaciente` en
  `src/application/use-cases/crearPaciente.ts` (valida con Zod, chequea unicidad vía
  repositorio) (depende de T007, T008, T009, T010, T012)
- [X] T024 [US1] Implementar `POST /api/patients` en `src/app/api/patients/route.ts` per
  `contracts/patients-api.md` (depende de T023) — incluye también el `GET` (ver T032)
- [X] T025 [US1] Implementar flujo de creación local-first (UUID generado en cliente,
  escribe en Dexie + encola outbox, navega de inmediato a la ficha) en
  `src/app/pacientes/nuevo/` (lógica de página, depende de T012, T013)
- [X] T026 [US1] Construir formulario de alta en `src/app/pacientes/nuevo/page.tsx` con los
  componentes Input/Button/Alert de `docs/design-system.md` §6.1/6.2/6.7
- [X] T027 [US1] Conectar validación y mensajes de error en la UI (campos obligatorios,
  aviso de duplicado mostrando el paciente existente) en el mismo formulario

**Verificado**: `tsc --noEmit` limpio, `eslint` limpio, 9/9 tests unitarios/integración
pasan. Se construyeron también `src/app/pacientes/page.tsx` (listado) y
`src/app/pacientes/[id]/page.tsx` (ficha, vista) porque US1 no es demostrable de punta a
punta sin un lugar donde ver el paciente creado — esto adelantó buena parte de US2.

**Checkpoint**: US1 funcional de punta a punta, incluso sin conexión (gracias a
Foundational).

---

## Phase 4: User Story 2 - Buscar un paciente existente (Priority: P2)

**Goal**: Encontrar pacientes por nombre (parcial) o documento (exacto), excluyendo
archivados por defecto (FR-005, FR-006).

**Independent Test**: Con varios pacientes cargados, buscar por nombre parcial y por
documento exacto y verificar resultados correctos; buscar algo sin coincidencias y ver el
estado vacío (Escenario 2 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T028 [P] [US2] Test unitario de `buscarPacientes` (parcial insensible a
  mayúsculas, exacto por documento, exclusión de archivados por defecto) en
  `tests/unit/buscarPacientes.test.ts` — 5/5 pasan
- [X] T029 [P] [US2] Test de integración de `GET /api/patients` (con/sin `q`, con
  `estado`) en `tests/integration/patients-search.test.ts` — 4/4 pasan; endpoint también
  verificado a mano contra PostgreSQL real (crear, duplicado, validación y búsqueda)
- [X] T030 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` en
  `tests/e2e/buscar-paciente.spec.ts` — 3/3 pasan contra PostgreSQL real (escrito durante
  Polish, junto con T050, al correr los 5 escenarios de quickstart.md de punta a punta)

### Implementation for User Story 2

- [X] T031 [US2] Implementar caso de uso `buscarPacientes` en
  `src/application/use-cases/buscarPacientes.ts` (depende de T008, T010, T012) —
  implementado antes de tiempo: lo necesitaba el "pull" del syncEngine (ver nota en T014)
- [X] T032 [US2] Implementar `GET /api/patients` en `src/app/api/patients/route.ts` per
  `contracts/patients-api.md` (mismo archivo que T024 — depende de T024, T031) — ídem,
  adelantado por la misma razón
- [X] T033 [US2] Construir página de listado/búsqueda en `src/app/pacientes/page.tsx`
  (tabla responsive per `docs/design-system.md` §6.5, con debounce de búsqueda per
  Principio VIII) — usa `useLiveQuery` de Dexie, se refresca sola al sincronizar
- [X] T034 [US2] Implementar estado vacío "sin resultados" (Alert `info` de
  `docs/design-system.md` §6.7) en la misma página

**Nota histórica**: la implementación de esta fase quedó adelantada por necesidad del
pull-sync (ver T014); sus tests dedicados (T028, T029, T030) se completaron después,
durante Polish, junto con T050.

**Checkpoint**: US1 y US2 funcionan juntas de forma independiente.

---

## Phase 5: User Story 3 - Editar los datos de un paciente (Priority: P3)

**Goal**: Corregir/actualizar datos de un paciente activo, con re-validación de unicidad y
bloqueo de edición directa si está archivado (FR-007, FR-008).

**Independent Test**: Editar teléfono/email/dirección de un paciente activo y verificar
persistencia; intentar cambiar el documento a uno ya usado y verificar rechazo; intentar
editar un paciente archivado y verificar que exige reactivar primero (Escenario 3 de
`quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T035 [P] [US3] Test unitario de `editarPaciente` (unicidad al cambiar documento,
  bloqueo si archivado, detección de conflicto por `baseVersion`) en
  `tests/unit/editarPaciente.test.ts` — 5/5 pasan
- [X] T036 [P] [US3] Test de integración de `PUT /api/patients/:id` (200, 409 duplicado, 409
  `PACIENTE_ARCHIVADO`, 409 `CONFLICTO_VERSION`) en
  `tests/integration/patients-edit.test.ts` — 4/4 pasan; también verificado a mano contra
  PostgreSQL real (crear + editar, version 1→2)
- [ ] T037 [P] [US3] Test e2e del Escenario 3 de `quickstart.md` en
  `tests/e2e/editar-paciente.spec.ts` — escrito, no ejecutado (requiere Playwright +
  navegador instalado, no disponible en este entorno)

### Implementation for User Story 3

- [X] T038 [US3] Implementar caso de uso `editarPaciente` en
  `src/application/use-cases/editarPaciente.ts` (maneja `baseVersion` y
  `conflictoPendiente` per `data-model.md`) (depende de T007, T008, T009, T010, T012)
- [X] T039 [US3] Implementar `PUT /api/patients/:id` en
  `src/app/api/patients/[id]/route.ts` per `contracts/patients-api.md` (depende de T038)
- [X] T040 [US3] Construir ficha/edición en `src/app/pacientes/[id]/page.tsx` (bloqueo de
  edición si `estado === ARCHIVADO` con CTA "reactivar primero")
- [X] T041 [US3] Implementar aviso de conflicto pendiente (banner `warning` de
  `docs/design-system.md` §6.7) cuando `conflictoPendiente` no es null, en la misma ficha —
  se construyó junto con T040 (misma pantalla, junto con los botones archivar/reactivar de
  US4 por eficiencia, ver nota en Fase 6)

**Checkpoint**: US1, US2 y US3 funcionan juntas de forma independiente.

---

## Phase 6: User Story 4 - Archivar un paciente que ya no se atiende (Priority: P4)

**Goal**: Archivar (baja lógica) y reactivar pacientes, sin pérdida de datos (FR-009 a
FR-011).

**Independent Test**: Archivar un paciente activo y verificar que desaparece del listado
por defecto pero es visible en la vista de archivados con todos sus datos; reactivarlo y
verificar que vuelve al listado; archivar uno ya archivado y verificar que no da error
(Escenario 4 de `quickstart.md`).

### Tests for User Story 4 (obligatorios) ⚠️

- [X] T042 [P] [US4] Test unitario de `archivarPaciente`/`reactivarPaciente` (idempotencia
  al archivar uno ya archivado) en `tests/unit/archivarReactivarPaciente.test.ts` — 4/4 pasan
- [X] T043 [P] [US4] Test de integración de `POST /api/patients/:id/archive` y
  `/reactivate` en `tests/integration/patients-archive.test.ts` — 4/4 pasan; también
  verificado a mano contra PostgreSQL real (archivar, archivar de nuevo = idempotente,
  desaparece de la búsqueda activa, reactivar)
- [ ] T044 [P] [US4] Test e2e del Escenario 4 de `quickstart.md` en
  `tests/e2e/archivar-paciente.spec.ts` — escrito, no ejecutado (sin navegador Playwright
  en este entorno)

### Implementation for User Story 4

- [X] T045 [US4] Implementar casos de uso `archivarPaciente` y `reactivarPaciente` en
  `src/application/use-cases/archivarPaciente.ts` y
  `src/application/use-cases/reactivarPaciente.ts` (depende de T007, T008, T010, T012)
- [X] T046 [US4] Implementar `POST /api/patients/:id/archive` en
  `src/app/api/patients/[id]/archive/route.ts` (depende de T045)
- [X] T047 [US4] Implementar `POST /api/patients/:id/reactivate` en
  `src/app/api/patients/[id]/reactivate/route.ts` (depende de T045)
- [X] T048 [US4] Construir vista de archivados en `src/app/pacientes/archivados/page.tsx`
- [X] T049 [US4] Agregar badge de estado (Activo/Archivado, `docs/design-system.md` §6.6) y
  botones archivar/reactivar en listado (`pacientes/page.tsx`) y ficha (`pacientes/[id]/page.tsx`)
  — los botones quedaron en la ficha (T040/T041); el listado activo no los necesita porque
  solo muestra activos por defecto (FR-006)

**Verificado**: `tsc --noEmit` y `eslint` limpios, 35/35 tests unitarios/integración pasan,
`npm run build` sin errores. Flujo completo (crear→archivar→idempotencia→excluido de
búsqueda→reactivar) probado a mano contra PostgreSQL real.

**Checkpoint**: Las 4 historias de usuario funcionan juntas de forma independiente — spec
`001-gestion-pacientes` completo.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validación del comportamiento transversal (offline/sync, responsive,
accesibilidad, seguridad) que ninguna historia individual cubre por sí sola.

- [X] T050 [P] Test e2e del Escenario 5 de `quickstart.md` (offline completo, sync por
  lotes) en `tests/e2e/offline-sync.spec.ts` — **pasa, contra PostgreSQL real**: crear un
  paciente completamente offline y verificar que sincroniza solo al reconectar (confirmado
  con una consulta directa a la base). Al escribirlo se encontró que faltaba la mitad de la
  arquitectura offline: sin Service Worker, el navegador ni carga la página sin conexión.
  Se agregó `@ducanh2912/next-pwa` (research.md #10) — con esto, el escenario completo
  (offline→online→sincronizado) quedó probado de punta a punta, no solo la capa de datos.
  El sub-caso de conflicto entre dos dispositivos (mencionado en quickstart.md como
  "opcional") no se automatizó — queda para una futura vuelta si hace falta.
- [X] T051 [P] Revisar las pantallas de `pacientes/` en los tres breakpoints de
  `docs/design-system.md` §4.0 (celular/tablet/escritorio) — tabla vs. tarjetas, modal
  full-screen en celular. Verificado con un navegador real en los tres tamaños de
  viewport (375×667, 768×1024, 1280×800) contra `/pacientes` y `/pacientes/nuevo`: **cero
  scroll horizontal** en los tres. Revisión de código confirma que `pacientes.module.css`
  cambia a tarjetas apiladas por debajo de 1024px (§6.5) y `Modal.module.css` pasa a
  pantalla completa por debajo de 640px (§6.4), tal como pide el design system.
- [X] T052 [P] Auditoría de accesibilidad (contraste 4.5:1, áreas táctiles ≥44×44px) per
  `docs/design-system.md` §4.1 en todas las pantallas nuevas. Se encontró y corrigió un bug
  real: los `Input` sin `name`/`id` explícito dejaban el `<label>` sin asociar al campo
  (rompía lectores de pantalla y `getByLabel` en los tests) — se corrigió en el propio
  componente `Input.tsx` con `useId()` como fallback, no solo parcheando los call sites.
  Alto/ancho de Button e Input confirmados en 44px por CSS (§4.1). Colores ya validados
  matemáticamente al definir la paleta (docs/design-system.md §2.1).
- [X] T053 Ejecutar `npm audit` (o equivalente) y resolver vulnerabilidades conocidas en
  dependencias, per Principio VII — de 18 vulnerabilidades (13 high, 1 critical) a **0**.
  `npm audit fix --force` sugería bajar Next.js de v15 a v9 (rompía toda la app, App Router
  no existe en esa versión) — en cambio: (1) `overrides` en `package.json` para
  `brace-expansion`, `esbuild`, `postcss`, `sharp` (parches de seguridad transitivos de
  Next/ESLint, sin tocar la versión de Next); (2) upgrade real de `vitest` 2→4 y
  `@vitejs/plugin-react` 4→6 (la única forma de salir de la línea vulnerable de `vite`).
  Verificado: `tsc`, `eslint`, 35/35 tests y `npm run build` siguen limpios después del
  upgrade.
- [X] T054 Ejecutar los 5 escenarios de `quickstart.md` de punta a punta como validación
  final — **los 5 verificados contra PostgreSQL real**: Escenario 1 (alta/duplicado/
  validación) 3/3 e2e + curl manual; Escenario 2 (búsqueda) 3/3 e2e; Escenario 3 (edición/
  conflicto de documento/bloqueo si archivado) 3/3 e2e + curl manual; Escenario 4
  (archivar/idempotencia/reactivar) 3/3 e2e + curl manual; Escenario 5 (offline completo +
  sync al reconectar) 1/1 e2e, confirmado con consulta directa a la base. **Suite completa:
  13/13 tests e2e (Playwright) + 35/35 tests unitarios/integración (Vitest) — 48/48**.
- [X] T055 [P] Documentar instrucciones de setup en `README.md` (migraciones, variables de
  entorno, comandos de test)

---

## Phase 8: Rediseño visual + paginación (refinamiento, no nueva feature)

**Purpose**: la pantalla de pacientes funciona pero el usuario proveyó un mockup con un
estilo visual más profesional, y pidió paginación en lotes de 10 "con prácticas de
escalabilidad". Al revisar, se encontró que el problema de escalabilidad real no era solo
la pantalla — ver `research.md` #11 y #12.

- [X] T056 [P] Actualizar `contracts/patients-api.md` (`pagina`/`limite`/`desde`,
  respuesta `{ pacientes, total }`)
- [X] T057 [P] Documentar decisiones en `research.md` (#11 paginación en dos capas, #12
  sync incremental, #13 paleta de avatares reutilizada)
- [X] T058 Test de paginación de `PacienteRepositoryPrisma.buscar()` (mock de Prisma, mismo
  patrón que `tests/integration/patients-search.test.ts`) en
  `tests/integration/patients-search.test.ts` — 8/8 pasan (paginación + `desde`)
- [X] T059 Extender `IPacienteRepository`/`OpcionesBusquedaPacientes` (`pagina`/`limite`/
  `desde`, `buscar()` retorna `{ pacientes, total }`) en
  `src/domain/repositories/IPacienteRepository.ts`
- [X] T060 Extender `buscarPacientesQuerySchema` (`pagina`/`limite`/`desde`) en
  `src/application/dto/pacienteDto.ts`
- [X] T061 Reescribir `PacienteRepositoryPrisma.buscar()` con `skip`/`take`/`count` en
  paralelo y filtro `updatedAt` cuando venga `desde`, en
  `src/infrastructure/db/prisma/PacienteRepositoryPrisma.ts` (depende de T059)
- [X] T062 Agregar tabla `metaSync` a Dexie (bump de versión) en
  `src/infrastructure/db/dexie/db.ts`
- [X] T063 Reescribir `PacienteRepositoryDexie.buscar()` con query indexada por `estado` +
  paginación local (research.md #11, Capa A) en
  `src/infrastructure/db/dexie/PacienteRepositoryDexie.ts` (depende de T059, T062)
- [X] T064 Actualizar `GET /api/patients` (lee `pagina`/`limite`/`desde`, responde
  `{ pacientes, total }`) en `src/app/api/patients/route.ts` (depende de T061) — también
  se corrigió `src/app/(shell)/page.tsx` (home de `002-pantalla-inicio`), que llamaba al
  mismo `buscarPacientes` compartido y usaba la forma de retorno anterior
- [X] T065 Reescribir `pullCambiosDesdeServidor` con `desde` incremental + paginación en
  lotes para la primera sincronización (research.md #12, Capa B) en
  `src/infrastructure/sync/syncEngine.ts` (depende de T062, T064) — verificado contra
  Postgres real: `desde=ahora` devuelve 0 resultados en vez de la tabla completa
- [X] T066 [P] Documentar Avatar (§6.9) y Tabs (§6.10) en `docs/design-system.md`,
  actualizar §6.5 Table con las columnas nuevas y el pie de paginación — v1.4.0
- [X] T067 [P] Construir componente `Avatar` (rotación de 5 tonos existentes,
  research.md #13) en `src/components/ui/Avatar.tsx`
- [X] T068 [P] Construir componente `Tabs` (mismo patrón visual que el item activo de la
  Sidebar) en `src/components/ui/Tabs.tsx`
- [X] T069 Extender `Input` con slot de ícono a la izquierda en
  `src/components/ui/Input.tsx`
- [X] T070 Rediseñar `src/app/(shell)/pacientes/page.tsx` (buscador con ícono, tabs
  Activos/Archivados en vez de link, tabla semántica con avatar/email/fecha
  formateada/teléfono/estado/acciones vacía, pie de paginación) (depende de T063, T067,
  T068, T069). **Nota de diseño**: el link de navegación a la ficha quedó solo en el
  nombre+avatar (no en toda la fila ni en la celda de documento como antes) — patrón
  estándar de tablas profesionales, pero rompió varios tests e2e existentes que buscaban/
  clickeaban por documento; corregidos en T072 y en los tests de `002-pantalla-inicio` que
  dependían de la misma pantalla (`busqueda-inicio.spec.ts`).
- [X] T071 Reemplazar `src/app/(shell)/pacientes/archivados/page.tsx` por un `redirect()`
  a `/pacientes?estado=ARCHIVADO` (depende de T070)
- [X] T072 Actualizar `tests/e2e/archivar-paciente.spec.ts` para usar la pestaña
  "Archivados" en vez de navegar a la ruta separada (depende de T071) — junto con
  `alta-paciente.spec.ts`, `editar-paciente.spec.ts` y `offline-sync.spec.ts`, todos
  afectados por el cambio de T070 (buscar por `<tr>`+documento en vez de por link, y
  agregar un paso de búsqueda antes de ubicar la fila para que sea robusto a la
  paginación real). También se corrigió `busqueda-inicio.spec.ts` (`002-pantalla-inicio`)
  por el mismo motivo. Se encontró y corrigió además una intermitencia real en
  `offline-sync.spec.ts`: el calentamiento del Service Worker no visitaba `/pacientes`
  (el destino real tras crear), solo `/pacientes/nuevo` — verificado 4/4 estable tras el
  fix.
- [X] T073 Verificación final: `tsc`, `eslint`, `vitest` (51/51), `build`, y
  `playwright test` completo contra Postgres real con 15 pacientes de prueba sembrados —
  paginación real confirmada (página 1: 10, página 2: resto, `total` correcto) y la
  sincronización de fondo con `desde=ahora` devuelve 0 en vez de la tabla completa.
  22/22 tests e2e propios de esta fase pasan; los 2 fallos restantes en la suite completa
  (`configuracion.spec.ts`, `inicio-resumen.spec.ts`) son un bug preexistente de
  `002-pantalla-inicio` (locator ambiguo, texto duplicado en su UI) sin relación con este
  trabajo.

**Checkpoint**: pantalla de pacientes con el estilo del mockup, paginada en ambas capas,
sin abrir una spec nueva.

## Phase 9: Rediseño de "Nuevo paciente" + campo Género

**Objetivo**: aplicar el segundo mockup del usuario a la pantalla de alta de paciente
(secciones con ícono+título, grilla de 2 columnas, sin la sección de datos médicos
iniciales del mockup) y agregar el campo Género, opcional, a lo largo de las tres capas
(dominio, Prisma, Dexie).

**Decisiones confirmadas con el usuario**: `nombreCompleto` se mantiene como un solo campo
(no se separa en Nombres/Apellidos, para no migrar el dato existente ni tocar
búsqueda/tabla/ficha/avatar en otros archivos); Género es opcional, no obligatorio.

- [X] T074 [P] Agregar `type Genero` y el campo `genero: Genero | null` a la entidad de
  dominio `Paciente` (`src/domain/entities/Paciente.ts`), incluido en
  `DatosNuevoPaciente` y `crearPacienteDesdeDatos`.
- [X] T075 [P] Agregar `genero` (enum, nullable, opcional) a `crearPacienteInputSchema` en
  `src/application/dto/pacienteDto.ts` — `editarPacienteInputSchema` lo hereda automático
  vía `.omit({id:true}).extend(...)`.
- [X] T076 [P] Agregar `genero?: Genero | null` a `DatosEdicionPaciente` en
  `src/domain/repositories/IPacienteRepository.ts`.
- [X] T077 Migración de Prisma: enum `Genero` (`MASCULINO` \| `FEMENINO` \| `OTRO` \|
  `PREFIERO_NO_DECIR`) + columna `genero` nullable en `Paciente`
  (`prisma/migrations/20260731162440_add_genero_paciente`). Aplicada contra Postgres real.
- [X] T078 [P] Mapear `genero` en `PacienteRepositoryPrisma.ts` (`aDominio`, `crear`,
  `editar` — los tres construían el objeto explícito campo por campo, sin spread).
- [X] T079 [P] Mapear `genero` en `PacienteRepositoryDexie.ts` (`editar` — `crear` ya lo
  cubre porque delega en `crearPacienteDesdeDatos`).
- [X] T080 Crear componente `Select` reutilizable (`src/components/ui/Select.tsx` +
  `.module.css`) — mismos tokens/estados que Input (§6.2), con flecha decorativa.
- [X] T081 Crear `src/components/ui/generoOpciones.ts` (opciones del Select + mapa de
  etiquetas legibles, compartido entre alta y edición).
- [X] T082 Rediseñar `src/app/(shell)/pacientes/nuevo/page.tsx` según el segundo mockup:
  secciones "Datos personales" / "Información de contacto" con ícono+título, grilla de 2
  columnas (1 columna por debajo de 640px), campo Género, sin sección de datos médicos
  iniciales (excluida a pedido explícito), notas al pie informativas (reescritas para no
  prometer funciones que no existen todavía — ej. historia clínica). Botón cambia de
  "Guardar" a "Crear paciente" (el de edición conserva "Guardar").
- [X] T083 Agregar Género al formulario de edición y a la vista de solo lectura en
  `src/app/(shell)/pacientes/[id]/page.tsx`.
- [X] T084 Actualizar docs: `data-model.md` (campo `genero`), `contracts/patients-api.md`
  (body de `POST`), `design-system.md` (§6.2 Select, nuevo §6.11 Formulario en secciones,
  v1.4.0 → v1.5.0) y el comentario de versión en `globals.css`.
- [X] T085 Actualizar tests unitarios/integración: fixture de `buscarPacientes.test.ts`
  (`genero: null` — el campo no admite `undefined` en el tipo `Paciente`), casos nuevos de
  género válido/inválido en `crearPaciente.test.ts`, reenvío de género en
  `editarPaciente.test.ts`, y creación con género en `patients-create.test.ts` (201/422).
- [X] T086 Actualizar 6 archivos e2e (`alta-paciente`, `editar-paciente`,
  `archivar-paciente`, `buscar-paciente`, `offline-sync`, y `busqueda-inicio` de
  `002-pantalla-inicio`) — el botón de creación pasó de "Guardar" a "Crear paciente", así
  que `getByRole("button", { name: /guardar/i })` en el flujo de alta dejó de matchear. Se
  tuvo cuidado de **no** tocar el botón "Guardar" del formulario de edición en
  `editar-paciente.spec.ts` (ese no cambió de texto).
- [X] T087 Verificación final: `tsc`, `eslint`, `vitest` (56/56, +5 nuevos), `build`, y
  `playwright test` contra el build de producción. Se encontró que la cuenta sembrada tenía
  una contraseña distinta a la de los tests (cambiada manualmente por el usuario en algún
  momento) — confirmado con el usuario, reseteada a la del seed solo para poder correr los
  e2e. 21/21 tests relevantes pasan (incluidos los 16 que tocan la pantalla rediseñada); los
  mismos 2 fallos preexistentes de `002-pantalla-inicio`
  (`configuracion.spec.ts`/`inicio-resumen.spec.ts`, locator ambiguo) siguen sin relación
  con este trabajo. Datos de prueba `E2E-*` limpiados de la base al terminar.

**Checkpoint**: alta de paciente con el estilo del segundo mockup, campo Género disponible
en alta y edición, sin abrir una spec nueva.

## Phase 9b: Ajustes de layout, placeholders y documento de identidad

**Objetivo**: el usuario señaló que el formulario quedaba angosto comparado con el mockup
(desaprovechaba el espacio horizontal) y pidió placeholders en cada campo, más un campo de
Documento de identidad con selector V-/E- y puntos de miles automáticos mientras se escribe.

- [X] T088 Ensanchar `src/app/(shell)/pacientes/nuevo/nuevo.module.css` (`max-width: 720px`
  → `1100px`) y separar la grilla en `.grid3` (Datos personales: Documento/Fecha
  nacimiento/Género en una misma fila, como el mockup) y `.grid2` (Información de
  contacto), con sus propios breakpoints de colapso.
- [X] T089 [P] Crear `src/components/ui/documentoIdentidad.ts`: `formatearNumeroDocumento`
  (puntos de miles, solo visual), `parsearDocumentoIdentidad` (separa un valor guardado
  como `V29838893` en prefijo+número para poder editarlo) y `combinarDocumentoIdentidad`
  (reconstruye el valor a guardar — sin puntos ni guion, misma convención que los datos
  existentes).
- [X] T090 [P] Crear `src/components/ui/DocumentoIdentidadInput.tsx` (+ `.module.css`):
  selector V-/E- + número en un solo campo visual, mismo alto/foco/error que Input (§6.2).
- [X] T091 Integrar `DocumentoIdentidadInput` en alta (`pacientes/nuevo/page.tsx`) y edición
  (`pacientes/[id]/page.tsx`, con `parsearDocumentoIdentidad` al iniciar la edición) +
  agregar placeholders a Nombre completo, Teléfono, Email y Dirección en el alta.
- [X] T092 Actualizar 6 archivos e2e (`alta-paciente`, `archivar-paciente`,
  `buscar-paciente`, `editar-paciente`, `offline-sync`, `busqueda-inicio`): los
  identificadores de prueba pasan de `E2E-<algo>-<timestamp>` a `V9009<timestamp>` — el
  campo de número ahora filtra cualquier carácter no numérico al tipear, así que un texto
  con letras dejaba de coincidir consigo mismo al buscarlo/mostrarlo después de guardado.
- [X] T093 Actualizar `data-model.md` (convención de formato de `documentoIdentidad`) y
  `design-system.md` (§6.11 con las 2 grillas y el campo compuesto, v1.5.0 → v1.6.0).
  Verificación: `tsc`, `eslint`, `vitest` (56/56), `build`, y 16/16 tests e2e afectados
  contra el build de producción reconstruido. Datos de prueba `V9009*` limpiados al
  terminar.

**Checkpoint**: formulario de alta con el ancho y la distribución del mockup, documento de
identidad con selector V-/E- y formato de miles, sin abrir una spec nueva.

## Phase 9c: Un solo formulario para alta/edición + ficha modernizada

**Objetivo**: el usuario pidió que la edición de un paciente se vea idéntica al alta
(mismo componente, no un formulario aparte), y dejó libertad creativa para modernizar la
pantalla de solo-lectura (nombre/estado/campos/botones Editar-Archivar) al mismo estilo.

- [X] T094 [P] Extraer `src/components/pacientes/PacienteFormulario.tsx` (+
  `.module.css`): Card + form completo (secciones, grillas, Documento, Género), con
  `valoresIniciales`/`erroresCampo`/`avisoDuplicado`/`guardando`/`textoEnviar`/
  `onEnviar`/`onCancelar` como props — el estado de cada campo lo maneja el propio
  componente (se remonta limpio cada vez que la ficha entra en modo edición).
- [X] T095 [P] Extraer íconos de sección compartidos a `src/components/pacientes/iconos.tsx`
  (Persona, Contacto, y nuevos por-campo: Documento, Calendario, Teléfono, Email,
  Dirección, Género) y `formatearFecha`/`formatearDocumentoIdentidad` a
  `src/components/pacientes/formatearFecha.ts` /
  `src/components/ui/documentoIdentidad.ts` — reutilizados entre el listado, el
  formulario y la ficha.
- [X] T096 Agregar tamaño `lg` (64px) a `Avatar` para el encabezado de la ficha.
- [X] T097 Reescribir `pacientes/nuevo/page.tsx` para usar `PacienteFormulario` (queda solo
  con el título, el componente y las notas al pie).
- [X] T098 Rediseñar `pacientes/[id]/page.tsx`: modo lectura con `Avatar lg` + secciones con
  ícono + campos ícono/label/valor (mismo lenguaje visual que el formulario); modo edición
  ahora renderiza `PacienteFormulario` directamente en vez de un form propio.
- [X] T099 Actualizar `design-system.md` (§6.9 Avatar `lg`, §6.11 nota de formulario
  compartido, nuevo §6.12 Ficha de paciente, v1.6.0 → v1.7.0). Verificación: `tsc`,
  `eslint`, `vitest` (56/56, sin cambios de comportamiento — refactor puramente de UI),
  build, y e2e completo contra el build de producción.

**Checkpoint**: alta y edición comparten un único componente de formulario; la ficha de
solo lectura sigue el mismo lenguaje visual (secciones con ícono, avatar grande).

## Phase 9d: Estado civil, Ocupación, Edad calculada y correcciones de la lista

**Objetivo**: agregar dos campos nuevos (Estado civil, Ocupación) al formulario y a la
ficha, reducir Género a 3 opciones, mostrar la edad calculada en la ficha, y corregir dos
detalles visuales del listado señalados por el usuario: el documento debía verse formateado
igual que en la ficha, y las pestañas Activos/Archivados necesitaban más contraste.

- [X] T100 [P] Agregar `EstadoCivil` al dominio (`src/domain/entities/Paciente.ts`), reducir
  `Genero` a `MASCULINO`/`FEMENINO`/`OTRO` (se saca `PREFIERO_NO_DECIR`), agregar
  `estadoCivil`/`ocupacion` a `Paciente`/`DatosNuevoPaciente`.
- [X] T101 [P] Actualizar Zod (`pacienteDto.ts`: `estadoCivilSchema`, `ocupacion`, enum de
  género reducido) y `DatosEdicionPaciente` (`IPacienteRepository.ts`).
- [X] T102 Migración de Prisma: enum `EstadoCivil`, columnas `estadoCivil`/`ocupacion`, y
  `Genero` sin `PREFIERO_NO_DECIR` (recreación del tipo enum — sin filas afectadas,
  verificado antes de migrar que ningún registro usaba ese valor). Aplicada con
  `prisma migrate diff` + `migrate deploy` (no interactivo) porque `migrate dev` exige
  confirmación manual al detectar que se remueve un valor de enum.
- [X] T103 [P] Mapear `estadoCivil`/`ocupacion` en ambos repositorios (Prisma y Dexie).
- [X] T104 [P] Crear `src/components/ui/estadoCivilOpciones.ts`; reducir
  `generoOpciones.ts` a 3 opciones.
- [X] T105 Agregar Select de Estado civil e Input de Ocupación a `PacienteFormulario.tsx`
  (fila 3 de la grilla de "Datos personales", después de Documento/Fecha/Género).
- [X] T106 Agregar `calcularEdad` (`src/components/pacientes/formatearFecha.ts`) y mostrar
  Edad/Estado civil/Ocupación en la ficha (`pacientes/[id]/page.tsx`) — la grilla de 3
  columnas queda con 2 filas exactas: Documento/Fecha/Edad y Género/Estado civil/Ocupación.
- [X] T107 Formatear la columna Documento del listado (`pacientes/page.tsx`) con
  `formatearDocumentoIdentidad`, igual que en la ficha — antes mostraba el valor crudo.
- [X] T108 Dar más contraste a `Tabs` (borde `--color-slate-300` + `--shadow-sm` en el
  contenedor) a pedido del usuario, comparando con su mockup.
- [X] T109 Actualizar 6 archivos e2e: la tabla ahora muestra el documento formateado, así
  que las aserciones de texto/`hasText` contra filas de la tabla dejaron de matchear el
  valor crudo generado en los tests — se agregó `tests/e2e/helpers/formatearDocumento.ts`
  (réplica mínima de la función de formato, ya que los tests e2e no importan código de
  `src/`) y se usó en cada aserción sobre texto de tabla (no en los `.fill()` de búsqueda,
  que siguen usando el valor crudo porque la búsqueda por documento es exacta contra el
  valor guardado).
- [X] T110 Actualizar docs (`data-model.md`, `contracts/patients-api.md`,
  `design-system.md` v1.7.0 → v1.8.0) y agregar tests unitarios para Estado civil/ocupación
  válidos e inválidos. Verificación: `tsc`, `eslint`, `vitest` (58/58), build, y e2e
  completo contra el build de producción.

**Checkpoint**: ficha y formulario con todos los campos del paciente; listado con
documento formateado y pestañas con contraste visible.

## Phase 9e: Alta salta directo a la ficha (con conexión real)

**Objetivo**: al crear un paciente, saltar directo a su ficha en vez de al listado — a
pedido del usuario, con la condición de que solo pase si hay conexión real (research.md
#14 documenta la investigación completa y por qué `navigator.onLine` no alcanza).

- [X] T111 Investigar si es posible evitar el fallback al listado por completo: se probó
  con pruebas e2e reales (offline, id nunca visitado, y con la ficha de otro paciente ya
  visitada antes) — falla siempre con `net::ERR_FAILED`. Confirmado: no es evitable sin un
  hack de Service Worker de alto riesgo. Se descarta esa vía.
- [X] T112 Crear `src/components/pacientes/conectividad.ts#hayConexionReal` (prueba real y
  corta contra `/api/patients`, con timeout) — se descartó `navigator.onLine` tras
  comprobar que reporta `true` incluso sin conexión real en una página recién cargada
  offline (reproducido de forma consistente, no solo una vez).
  `pacientes/nuevo/page.tsx`: navega a `/pacientes/${id}` si hay conexión, si no a
  `/pacientes` (comportamiento previo).
- [X] T113 Actualizar 6 archivos e2e (`alta-paciente`, `archivar-paciente`,
  `buscar-paciente`, `editar-paciente`, `busqueda-inicio`) cuyos helpers/tests asumían que
  crear siempre termina en `/pacientes` — ahora esperan la ficha
  (`/pacientes/[0-9a-f-]{36}$/`) cuando la creación es online, lo que además simplificó
  varios helpers (ya no hace falta buscar y hacer clic para entrar a la ficha, se llega
  directo). `offline-sync.spec.ts` no cambió: sigue esperando `/pacientes`, comportamiento
  correcto sin conexión.
- [X] T114 Documentar la decisión e investigación en `research.md` #14. Verificación:
  `tsc`, `eslint`, `vitest` (58/58), build, y e2e completo contra el build de producción
  (22/22 relevantes; los mismos 2 fallos preexistentes de `002-pantalla-inicio` sin
  relación). Un tercer fallo intermitente visto en una corrida (conteo de pacientes activos
  del inicio) se confirmó que era por volumen de datos de prueba sin limpiar entre
  corridas, no una regresión — desapareció al limpiar y repetir.

**Checkpoint**: crear un paciente con conexión lleva directo a su ficha; sin conexión cae
al listado como antes, sin romper el flujo offline-first.

## Phase 9f: Correcciones al listado (búsqueda por cédula, columnas)

**Objetivo**: el usuario reportó que la búsqueda no encontraba pacientes por cédula
(solo por nombre), y pidió simplificar la tabla: Edad en vez de fecha de nacimiento, y
sacar las columnas Estado y Acciones.

- [X] T115 Arreglar búsqueda por documento en `PacienteRepositoryPrisma.buscar()` y
  `PacienteRepositoryDexie.buscar()`: se normaliza `q` a solo dígitos y se compara contra
  el final (`endsWith`) del `documentoIdentidad` guardado, en vez de una igualdad exacta —
  research.md #15 documenta el bug (el prefijo V-/E- nunca lo tipea el usuario).
- [X] T116 Reemplazar la columna "F. Nacimiento" del listado por "Edad" calculada
  (`calcularEdad`, mismo criterio que la ficha).
- [X] T117 Sacar las columnas "Estado" y "Acciones" del listado (`pacientes/page.tsx`):
  Estado quedó redundante con las pestañas Activos/Archivados; Acciones nunca tuvo
  contenido.
- [X] T118 Actualizar tests: nuevo caso e2e y de integración para búsqueda por cédula sin
  prefijo (`buscar-paciente.spec.ts`, `patients-search.test.ts`); quitar la aserción sobre
  el badge "Estado" en `offline-sync.spec.ts` (columna eliminada).
- [X] T119 Actualizar `design-system.md` (§6.5, v1.9.0 → v1.10.0), `contracts/patients-api.md`
  y `spec.md` (Assumptions) para reflejar la búsqueda por dígitos en vez de coincidencia
  exacta literal.

**Checkpoint**: buscar por cédula (con o sin prefijo) encuentra al paciente; tabla del
listado con Documento/Edad/Teléfono, sin columnas redundantes o vacías.

## Phase 9g: Cuenta de e2e separada de la cuenta real (bug transversal)

**Objetivo**: el usuario reportó que la búsqueda "seguía sin andar" y que quedó afuera del
sistema con sus credenciales del `.env` — investigando, la causa real no era la búsqueda
(que ya funcionaba): los tests e2e de **todas** las specs paralelas (001/002/003/004)
comparten la misma cuenta que el usuario usa de verdad (`odontologo@example.com`), y los
tests que cambian nombre/contraseña como parte de sus escenarios (`configuracion.spec.ts`)
se la pisaban sin aviso cada vez que alguna conversación corría su suite.

- [X] T120 Agregar `E2E_ODONTOLOGO_NOMBRE`/`EMAIL`/`PASSWORD` a `.env` y `.env.example` —
  cuenta separada, exclusiva para tests, nunca la misma que `SEED_ODONTOLOGO_*`.
- [X] T121 `prisma/seed.ts` siembra también la cuenta e2e si esas variables están
  configuradas (falla explícitamente si por error se configura igual a la cuenta real).
- [X] T122 Actualizar los 16 archivos `tests/e2e/*.spec.ts` (de las 4 specs) para que el
  valor por defecto (si la variable de entorno no está seteada) sea la cuenta de pruebas,
  nunca `odontologo@example.com` — así ni un entorno sin las variables configuradas puede
  volver a pisar la cuenta real por accidente.
- [X] T123 Restaurar la contraseña real del usuario (se le había pisado con la de los
  tests) y verificar que sigue intacta después de correr toda la suite de nuevo.
  Verificación: `tsc`, `eslint`, `vitest` (92/92), build, y e2e completo — 43/45. Los 2
  fallos restantes ya no tocan la cuenta real: uno es dos specs de consultorios
  compitiendo por la MISMA cuenta de pruebas en paralelo (cambiar-contraseña de una
  choca con el login de otra — mejora pendiente, no urgente, sería darle su propia cuenta a
  cada archivo de test), el otro es la flakiness ya conocida del conteo de "activos" del
  inicio bajo carga paralela (research.md de `002-pantalla-inicio`).

**Checkpoint**: la cuenta real del usuario nunca vuelve a ser tocada por una corrida de
tests e2e, sin importar qué spec/conversación la ejecute.

## Phase 9h: Búsqueda por documento — filtrar en tiempo real, no solo con el número completo

**Objetivo**: corregir el arreglo de la Fase 9f. El usuario reportó, después de descartar
build viejo y datos fantasma en Dexie (ver más abajo), que la búsqueda por cédula solo
encontraba al paciente si escribía el número **completo** — no iba filtrando con cada
dígito como sí hace la búsqueda por nombre.

- [X] T124 Cambiar `endsWith` por `includes` en la comparación de documento, tanto en
  `PacienteRepositoryPrisma.buscar()` (`contains` de Prisma) como en
  `PacienteRepositoryDexie.buscar()` — research.md #15 actualizado con las dos vueltas del
  bug (primero exacta, después `endsWith`, ahora `contains`).
- [X] T125 Actualizar el mock de `patients-search.test.ts` y agregar un test que busca con
  solo los primeros dígitos de la cédula (no el número completo) para cubrir exactamente
  el caso que se rompía.
- [X] T126 Actualizar `contracts/patients-api.md` y `spec.md` (Assumptions) para reflejar
  que la búsqueda por documento filtra en tiempo real, igual que por nombre.

**Nota sobre el diagnóstico** (para no repetir el camino largo): antes de encontrar esto,
se descartaron — con evidencia, no a ojo — dos hipótesis que resultaron ser problemas
reales pero distintos, encontrados en el camino: (1) el usuario y los tests e2e compartían
la misma cuenta real, pisándose la contraseña entre sí (Fase 9g); (2) pacientes de prueba
borrados directo de Postgres en limpiezas anteriores quedaron como "fantasmas" en el Dexie
del usuario, porque el protocolo de sync no propaga bajas duras, solo altas/ediciones
(hallazgo para tener en cuenta: no volver a borrar datos de prueba con SQL directo si ya
pudieron haber sincronizado a un cliente real). Verificación final: `tsc`, `eslint`,
`vitest`, build, y confirmado con el usuario en un navegador limpio que ahora sí filtra
progresivamente.

**Checkpoint**: escribir "2", después "29", después "298"... va acotando la lista en cada
paso, igual que ya pasa al buscar por nombre.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Fase 2)**: depende de Setup. Bloquea las 4 historias de usuario.
- **Historias de usuario (Fases 3-6)**: todas dependen de Foundational completo.
  - Pueden avanzar en paralelo si hay más de una persona trabajando, o secuencialmente en
    orden de prioridad P1 → P2 → P3 → P4 (recomendado para un solo desarrollador).
- **Polish (Fase 7)**: depende de que las historias que se quieran incluir estén completas.

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Sin dependencia de otras historias.
- **US2 (P2)**: solo depende de Foundational. Comparte el archivo
  `src/app/api/patients/route.ts` con US1 (GET junto a POST) — no son independientes a
  nivel de archivo, pero sí a nivel de comportamiento/test.
- **US3 (P3)**: solo depende de Foundational. Archivo propio
  (`src/app/api/patients/[id]/route.ts`).
- **US4 (P4)**: solo depende de Foundational. Archivos propios (`archive/`, `reactivate/`).

### Dentro de cada historia

- Tests primero (Principio I, NON-NEGOTIABLE) — deben fallar antes de implementar.
- Caso de uso (`application/`) antes que la ruta de API (`app/api/`).
- Ruta de API antes que la pantalla que la consume.
- Historia completa y verificada antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- T003, T004, T005 (Setup) en paralelo.
- T007, T009, T011, T016 (Foundational) en paralelo entre sí (archivos distintos, sin
  dependencia mutua).
- Los tests de cada historia (marcados [P]) en paralelo entre sí.
- US3 y US4 pueden desarrollarse en paralelo entre sí una vez Foundational está listo
  (archivos independientes); US1 y US2 comparten `route.ts` por lo que conviene
  secuenciarlas si es la misma persona.

---

## Parallel Example: Foundational

```bash
# Estas cuatro tareas tocan archivos distintos y no dependen entre sí:
Task: "Crear entidad de dominio Paciente en src/domain/entities/Paciente.ts"
Task: "Definir esquemas Zod en src/application/dto/pacienteDto.ts"
Task: "Definir esquema Dexie en src/infrastructure/db/dexie/db.ts"
Task: "Configurar Auth.js en src/infrastructure/auth/auth.config.ts"
```

## Parallel Example: User Story 1 (tests)

```bash
Task: "Test unitario de crearPaciente en tests/unit/crearPaciente.test.ts"
Task: "Test de integración de POST /api/patients en tests/integration/patients-create.test.ts"
Task: "Test e2e del Escenario 1 en tests/e2e/alta-paciente.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (crítico — bloquea todo; incluye poder iniciar sesión)
3. Completar Fase 3: User Story 1
4. **Parar y validar**: probar US1 de forma independiente (Escenario 1 de `quickstart.md`),
   incluido el caso offline básico (crear un paciente sin conexión y ver que sincroniza al
   reconectar)
5. Esto ya reemplaza una planilla/libreta externa de pacientes — entregable real.

### Incremental Delivery

1. Setup + Foundational → base lista (incluye login, offline-first y sync desde el día uno)
2. + US1 (alta) → validar → MVP usable
3. + US2 (búsqueda) → validar → el registro se vuelve manejable a medida que crece
4. + US3 (edición) → validar → fichas se mantienen al día
5. + US4 (archivado) → validar → listado se mantiene limpio a largo plazo
6. Polish → offline/sync a fondo, responsive, accesibilidad, seguridad

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- [Story] mapea cada tarea a su historia de usuario para trazabilidad contra `spec.md`.
- Los tests son obligatorios por el Principio I de la constitución — no se omiten aunque el
  template base los marque como opcionales.
- Verificar que los tests fallan antes de implementar (Red-Green-Refactor).
- Cada historia debe quedar completa y validada antes de continuar con la siguiente,
  excepto si hay más de un desarrollador trabajando en paralelo.
