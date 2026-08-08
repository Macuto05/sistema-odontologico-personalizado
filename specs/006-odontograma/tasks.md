---

description: "Task list for Odontograma (006-odontograma)"
---

# Tasks: Odontograma

**Input**: Design documents from `/specs/006-odontograma/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — Principio I (Test-First, NON-NEGOTIABLE) exige
tests que fallen, escritos antes del código de implementación. Cada fase de historia de
usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md). El spec
define 6 historias (US1/US2 = P1, US3/US4/US5 = P2, US6 = P3); dentro de una misma prioridad
se respeta el orden en que aparecen en spec.md.

**Nota sobre alcance**: esta feature reemplaza el placeholder "Odontograma" de
005-atencion-paciente y modifica su tab Diagnóstico (quita el campo "Plan de tratamiento",
FR-017). Reutiliza `Accordion`/`Modal`/`Tabs` ya existentes (`docs/design-system.md` §6) y el
motor de sync generalizado desde 004-consultorios. No agrega dependencias de paquete nuevas
(research.md #8).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1 a US6)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/components/`, `src/app/`, `prisma/`,
`tests/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: `Odontograma`, `CambioOdontograma`, `ItemPlanTratamiento` y el catálogo estático
de punta a punta (dominio → Dexie → Prisma → API → sync), más la eliminación migrada de
`Cita.planTratamiento`. Ninguna historia de usuario puede demostrarse sin esto.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [X] T001 Migración de Prisma en `prisma/schema.prisma`: enums `Denticion`
  (`ADULTO`/`NINO`), `Superficie` (`MESIAL`/`DISTAL`/`VESTIBULAR`/`PALATINO_LINGUAL`/
  `OCLUSAL_INCISAL`), `EstadoColorHallazgo` (`PENDIENTE`/`REALIZADO`), `TipoCambioOdontograma`
  (`AGREGADO`/`EDITADO`/`ELIMINADO`); modelos `Odontograma` (`id`, `pacienteId` FK,
  `denticion`, `hallazgos Json`, `version`, `conflictoPendiente Json?`, timestamps,
  `@@unique([pacienteId, denticion])`), `CambioOdontograma` (`id`, `odontogramaId` FK
  `onDelete: Cascade`, `pacienteId`, `denticion`, `tipoCambio`, `hallazgoId`, `dientes
  String[]`, `superficie?`, `descripcion`, `registradoEn`, `@@index([odontogramaId,
  registradoEn])`), `ItemPlanTratamiento` (`id`, `pacienteId` FK, `fecha`, `diente?`,
  `tratamiento`, `version`, `conflictoPendiente Json?`, timestamps) (`data-model.md`,
  research.md #2 a #5). En la misma migración: script SQL que copia cualquier
  `Cita.planTratamiento` no vacío hacia una fila nueva de `ItemPlanTratamiento`
  (`fecha = COALESCE(finalizadaEn, "createdAt")`, `diente = NULL`,
  `tratamiento = planTratamiento`) **antes** de eliminar la columna `planTratamiento` de
  `Cita` (data-model.md §Modificación a `Cita`, Principio III). Aplicar con
  `npx prisma migrate dev` contra una base real y verificar manualmente que no quedó ninguna
  fila huérfana.
- [X] T002 [P] Crear el catálogo estático de dominio en
  `src/domain/entities/CondicionOdontograma.ts`: las 44 condiciones acordadas (nombre,
  categoría, símbolo — badge o gráfico —, `admiteEstadoColor`, `aplicaA`, `multiDiente`,
  `exclusivoNino`, `variantes`), `CategoriaCondicion` (8 valores), `SimboloCondicion`
  (unión discriminada `BADGE`/`GRAFICO`), `DIENTES_ADULTO` (32 números FDI 11-48),
  `DIENTES_NINO` (20 números FDI 51-85) (`data-model.md` §CondicionOdontograma, research.md
  #1, #7).
- [X] T003 [P] Crear la entidad de dominio `Odontograma` (`Odontograma`, `HallazgoDental`,
  `Superficie`, `EstadoColor`, `crearOdontogramaVacio()`) en
  `src/domain/entities/Odontograma.ts` (`data-model.md` §Odontograma/§HallazgoDental).
- [X] T004 [P] Crear la entidad de dominio `CambioOdontograma` (`CambioOdontograma`,
  `TipoCambioOdontograma`, `describirCambio()` — genera el texto legible del campo
  `descripcion`) en `src/domain/entities/CambioOdontograma.ts` (`data-model.md`
  §CambioOdontograma).
- [X] T005 [P] Crear la entidad de dominio `ItemPlanTratamiento` en
  `src/domain/entities/ItemPlanTratamiento.ts` (`data-model.md` §ItemPlanTratamiento).
- [X] T006 [P] Agregar `OdontogramaNoEncontradoError`, `CondicionInvalidaError` y
  `CambioOdontogramaInmutableError` en `src/domain/errors.ts`, mismo patrón que
  `CitaFinalizadaError`/`EstudioNoEncontradoError` de 005.
- [X] T007 Crear la interfaz `IOdontogramaRepository` (`obtenerOCrear`, `editar`) en
  `src/domain/repositories/IOdontogramaRepository.ts` (depende de T003).
- [X] T008 [P] Crear la interfaz `ICambioOdontogramaRepository` (`registrar`,
  `listarPorOdontograma` — paginado) en
  `src/domain/repositories/ICambioOdontogramaRepository.ts` (depende de T004) — sin método
  de edición/eliminación, refuerza el append-only (research.md #4).
- [X] T009 [P] Crear la interfaz `IItemPlanTratamientoRepository` (`crear`, `editar`,
  `eliminar`, `listarPorPaciente`) en
  `src/domain/repositories/IItemPlanTratamientoRepository.ts` (depende de T005).
- [X] T010 [P] Crear `odontogramaDto.ts` (Zod): `hallazgoInputSchema` (valida `condicionId`
  contra el catálogo, `superficie` obligatoria/prohibida según `aplicaA`, `variante`
  obligatoria si el catálogo la exige, `dientes.length` según `multiDiente`, rechaza
  condiciones `exclusivoNino` si `denticion = "ADULTO"`), `itemPlanTratamientoInputSchema`
  (`tratamiento` obligatorio, `diente` opcional) en
  `src/application/dto/odontogramaDto.ts` (depende de T002, T003, T005).
- [X] T011 Extender `operacionSyncSchema` en `src/application/dto/syncDto.ts`: nuevos
  miembros de la unión discriminada `entidad: "ODONTOGRAMA"` (`tipo: "CREAR" | "EDITAR"`),
  `entidad: "CAMBIO_ODONTOGRAMA"` (`tipo: "CREAR"` únicamente), `entidad:
  "ITEM_PLAN_TRATAMIENTO"` (`tipo: "CREAR" | "EDITAR" | "ELIMINAR"`), `baseVersion`
  obligatorio solo para `EDITAR` (`contracts/odontograma-api.md`) (depende de T010).
- [X] T012 Generalizar `db.ts` (Dexie) en `src/infrastructure/db/dexie/db.ts`:
  `this.version(6)` agrega tablas `odontogramas: "id, pacienteId, denticion,
  [pacienteId+denticion]"`, `cambiosOdontograma: "id, odontogramaId, registradoEn,
  [odontogramaId+registradoEn]"`, `itemsPlanTratamiento: "id, pacienteId, fecha"`; extiende
  `EntidadOutbox` a `"PACIENTE" | "CONSULTORIO" | "CITA" | "ODONTOGRAMA" |
  "CAMBIO_ODONTOGRAMA" | "ITEM_PLAN_TRATAMIENTO"` (data-model.md, research.md #9) (depende
  de T003, T004, T005).
- [X] T013 Implementar `OdontogramaRepositoryDexie` (`obtenerOCrear`: busca localmente por
  `[pacienteId+denticion]`, crea vacío y encola `CREAR` si no existe, research.md #10;
  `editar`: valida con `odontogramaDto`, reemplaza `hallazgos` completo, encola `EDITAR`) en
  `src/infrastructure/db/dexie/OdontogramaRepositoryDexie.ts` (depende de T007, T012).
- [X] T014 [P] Implementar `CambioOdontogramaRepositoryDexie` (`registrar`: siempre `CREAR`,
  nunca actualiza una fila existente; `listarPorOdontograma`: ordenado por `registradoEn`
  descendente, paginado) en
  `src/infrastructure/db/dexie/CambioOdontogramaRepositoryDexie.ts` (depende de T008, T012).
- [X] T015 [P] Implementar `ItemPlanTratamientoRepositoryDexie` en
  `src/infrastructure/db/dexie/ItemPlanTratamientoRepositoryDexie.ts` (depende de T009,
  T012).
- [X] T016 Implementar `OdontogramaRepositoryPrisma` (`obtenerOCrear`: idempotente por
  `[pacienteId, denticion]`; `editar`: mismo mecanismo `version`/`conflictoPendiente` que
  `CitaRepositoryPrisma`) en
  `src/infrastructure/db/prisma/OdontogramaRepositoryPrisma.ts` (depende de T001, T007).
- [X] T017 [P] Implementar `CambioOdontogramaRepositoryPrisma` (`registrar`: `create` puro;
  `listarPorOdontograma`: `select` explícito, paginado por `registradoEn`, Principio VIII)
  en `src/infrastructure/db/prisma/CambioOdontogramaRepositoryPrisma.ts` (depende de T001,
  T008).
- [X] T018 [P] Implementar `ItemPlanTratamientoRepositoryPrisma` en
  `src/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma.ts` (depende de T001,
  T009).
- [X] T019 Implementar `GET /api/patients/[id]/odontogramas/route.ts` (los hasta dos
  `Odontograma` de un paciente) per `contracts/odontograma-api.md` (depende de T016).
- [X] T020 Implementar `GET /api/odontogramas/route.ts` (pull incremental global, mismo
  criterio que `GET /api/citas` de 005) per `contracts/odontograma-api.md` (depende de
  T016).
- [X] T021 Implementar
  `GET /api/patients/[id]/odontogramas/[denticion]/historial/route.ts` (paginado,
  descendente) per `contracts/odontograma-api.md` (depende de T017).
- [X] T022 Implementar `GET /api/cambios-odontograma/route.ts` (pull incremental global) per
  `contracts/odontograma-api.md` (depende de T017).
- [X] T023 Implementar `GET /api/patients/[id]/plan-tratamiento/route.ts` per
  `contracts/odontograma-api.md` (depende de T018).
- [X] T024 Implementar `GET /api/plan-tratamiento/route.ts` (pull incremental global) per
  `contracts/odontograma-api.md` (depende de T018).
- [X] T025 Extender `POST /api/sync` en `src/app/api/sync/route.ts`:
  `aplicarOperacionOdontograma` (`CREAR` idempotente, `EDITAR` con `baseVersion` →
  `CONFLICTO`), `aplicarOperacionCambioOdontograma` (`CREAR` únicamente — rechaza
  `EDITAR`/`ELIMINAR` con `400`, research.md #4), `aplicarOperacionItemPlanTratamiento`
  (`CREAR`/`EDITAR`/`ELIMINAR`), dispatch por `entidad` (`contracts/odontograma-api.md`)
  (depende de T011, T016, T017, T018).
- [X] T026 Extender `syncEngine.ts`: `pullOdontogramasDesdeServidor()`,
  `pullCambiosOdontogramaDesdeServidor()`, `pullPlanTratamientoDesdeServidor()`
  (incremental por `updatedAt`/`registradoEn`, mismo criterio que el pull de `Cita`,
  research.md #9), aplicar los tres resultados en `sincronizarLote()`, invocar desde
  `ejecutarCicloDeSync` en `src/infrastructure/sync/syncEngine.ts` (depende de T012, T020,
  T022, T024, T025).

**Checkpoint**: Con Foundational completo, `Odontograma`/`CambioOdontograma`/
`ItemPlanTratamiento` existen de punta a punta y el catálogo estático está disponible — las
historias de usuario pueden empezar.

---

## Phase 2: User Story 1 - Registrar un hallazgo en el odontograma (Priority: P1) 🎯 MVP

**Goal**: Diagrama de boca completa, clic en diente/superficie → modal con catálogo
categorizado → hallazgo marcado y persistido de inmediato (FR-001, FR-003 a FR-007,
FR-009).

**Independent Test**: Abrir el tab Odontograma de un paciente, marcar al menos una condición
sobre un diente completo y otra sobre una superficie específica, y verificar que quedan
reflejadas visualmente y persisten al recargar la página (Escenario 1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

- [X] T027 [P] [US1] Test unitario de `registrarHallazgo` (valida vía `odontogramaDto`,
  rechaza superficie en condición de diente completo y viceversa, exige variante cuando el
  catálogo la pide, respeta `multiDiente`/`exclusivoNino`, escribe el `HallazgoDental` y un
  `CambioOdontograma` tipo `AGREGADO` en la misma operación) en
  `tests/unit/registrarHallazgo.test.ts`.
- [X] T028 [P] [US1] Test unitario de `obtenerOCrearOdontograma` (crea vacío la primera vez
  para `(pacienteId, denticion)`, devuelve el existente después, sin acción explícita del
  usuario, research.md #10) en `tests/unit/obtenerOCrearOdontograma.test.ts`.
- [X] T029 [P] [US1] Test de integración de `POST /api/sync` para `ODONTOGRAMA`/`CREAR` +
  `EDITAR` junto con `CAMBIO_ODONTOGRAMA`/`CREAR` pareado en
  `tests/integration/odontograma-registrar.test.ts`.
- [X] T030 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` (clic en diente completo,
  clic en superficie, condición con variante, condición multi-diente, nota opcional,
  persistencia tras recargar) en `tests/e2e/odontograma-registrar.spec.ts`.

### Implementation for User Story 1

- [X] T031 [US1] Implementar el caso de uso `obtenerOCrearOdontograma` en
  `src/application/use-cases/obtenerOCrearOdontograma.ts` (usa `IOdontogramaRepository`)
  (depende de T007, T013, T016).
- [X] T032 [US1] Implementar el caso de uso `registrarHallazgo` en
  `src/application/use-cases/registrarHallazgo.ts` (valida con `odontogramaDto`, agrega el
  `HallazgoDental` al array `hallazgos` vía `IOdontogramaRepository.editar`, y registra un
  `CambioOdontograma` tipo `AGREGADO` vía `ICambioOdontogramaRepository.registrar` en la
  misma llamada) (depende de T007, T008, T010, T013, T014, T016, T017).
- [X] T033 [P] [US1] Crear el componente `SimboloBadge` (círculo/etiqueta de color con texto,
  parametrizado por color y texto, research.md #8) en
  `src/components/odontograma/SimboloBadge.tsx`.
- [X] T034 [P] [US1] Crear el componente `SimboloGrafico` (set acotado de símbolos SVG a
  medida: X, flecha recta, flecha curva, flechas cruzadas, zigzag, línea doble, línea
  sólida, línea punteada, círculo, research.md #8) en
  `src/components/odontograma/SimboloGrafico.tsx`.
- [X] T035 [US1] Crear `DienteSvg.tsx` (contorno del diente + cruz de 5 superficies,
  renderiza los hallazgos vigentes de ese diente superponiendo `SimboloBadge`/
  `SimboloGrafico` según corresponda, expone `onClickDiente`/`onClickSuperficie`) en
  `src/components/odontograma/DienteSvg.tsx` (depende de T033, T034).
- [X] T036 [US1] Crear `DiagramaBoca.tsx` (arcada superior e inferior, un `DienteSvg` por
  cada número de `DIENTES_ADULTO`/`DIENTES_NINO` según la dentición activa) en
  `src/components/odontograma/DiagramaBoca.tsx` (depende de T035, T002).
- [X] T037 [US1] Crear `PanelHerramientas.tsx` (reutiliza `Accordion`, 8 categorías
  colapsables listando las condiciones del catálogo como ítems seleccionables) en
  `src/components/odontograma/PanelHerramientas.tsx` (depende de T002).
- [X] T038 [US1] Crear `ModalSeleccionCondicion.tsx` (reutiliza `Modal`; catálogo
  categorizado + selector de variante si aplica + selector de dientes adicionales si
  `multiDiente` + nota de texto libre opcional; confirmar llama `registrarHallazgo`) en
  `src/components/odontograma/ModalSeleccionCondicion.tsx` (depende de T032, T037).
- [X] T039 [US1] Crear `OdontogramaTab.tsx` (reemplaza el placeholder deshabilitado de 005;
  carga el `Odontograma` vía `obtenerOCrearOdontograma`, renderiza `DiagramaBoca` +
  `PanelHerramientas`, abre `ModalSeleccionCondicion` al hacer clic en un diente/superficie
  sin hallazgo) en `src/components/odontograma/OdontogramaTab.tsx` (depende de T031, T036,
  T037, T038).
- [X] T040 [US1] Habilitar el tab Odontograma en `PanelAtencion.tsx` (quita el placeholder
  "Próximamente" de 005, monta `OdontogramaTab`) en
  `src/components/citas/PanelAtencion.tsx` (depende de T039).

**Checkpoint**: US1 funcional de punta a punta, incluso sin conexión — el odontólogo ya
puede marcar hallazgos y verlos reflejados y persistidos.

---

## Phase 3: User Story 2 - Alternar entre dentición Adulto y Niño (Priority: P1) 🎯 MVP

**Goal**: Dos pestañas (Adulto/Niño) con datos independientes; condiciones exclusivas de
niño ocultas en la vista Adulto (FR-002, FR-012).

**Independent Test**: Marcar un hallazgo en la vista Adulto, cambiar a Niño, marcar un
hallazgo distinto ahí, y verificar que ambas vistas conservan sus propios datos sin
mezclarse (Escenario 2 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T041 [P] [US2] Test unitario de filtrado del catálogo por dentición (Pulpotomía/
  Pulpectomía solo disponibles cuando `denticion = "NIÑO"`) en
  `tests/unit/catalogoDenticion.test.ts`.
- [X] T042 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` (datos independientes por
  vista, condiciones exclusivas de niño ausentes en Adulto) en
  `tests/e2e/odontograma-denticion.spec.ts`.

### Implementation for User Story 2

- [X] T043 [US2] Agregar las pestañas Adulto/Niño a `OdontogramaTab.tsx` — cambia la
  dentición activa, vuelve a llamar `obtenerOCrearOdontograma` para esa dentición, pasa el
  array de dientes correspondiente a `DiagramaBoca` (depende de T039, T036).
- [X] T044 [US2] Filtrar las condiciones mostradas en `PanelHerramientas.tsx` y
  `ModalSeleccionCondicion.tsx` según `exclusivoNino` y la dentición activa (depende de
  T037, T038, T043).

**Checkpoint**: US1 y US2 (ambas P1) funcionan juntas — MVP completo.

---

## Phase 4: User Story 3 - Corregir un hallazgo ya registrado (Priority: P2)

**Goal**: Editar (incluido cambiar estado pendiente↔realizado) o eliminar un hallazgo ya
marcado (FR-008).

**Independent Test**: Marcar un hallazgo, editarlo y luego eliminarlo, verificando que el
diagrama refleja cada cambio de inmediato (Escenario 3 de `quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T045 [P] [US3] Test unitario de `editarHallazgo` (cambia `estadoColor` u otros campos
  sin recrear el hallazgo, registra `CambioOdontograma` tipo `EDITADO`) y `eliminarHallazgo`
  (quita el hallazgo del array, registra `CambioOdontograma` tipo `ELIMINADO`) en
  `tests/unit/editarHallazgo.test.ts`.
- [X] T046 [P] [US3] Test e2e del Escenario 3 de `quickstart.md` en
  `tests/e2e/odontograma-corregir.spec.ts`.

### Implementation for User Story 3

- [X] T047 [US3] Implementar el caso de uso `editarHallazgo` en
  `src/application/use-cases/editarHallazgo.ts` (depende de T007, T008, T013, T014, T016,
  T017).
- [X] T048 [US3] Implementar el caso de uso `eliminarHallazgo` en
  `src/application/use-cases/eliminarHallazgo.ts` (depende de T007, T008, T013, T014, T016,
  T017).
- [X] T049 [US3] Extender `DienteSvg.tsx`/`ModalSeleccionCondicion.tsx`: clic sobre un
  diente/superficie con hallazgo(s) existente(s) muestra el/los hallazgo(s) con opción de
  editar o eliminar, en vez de solo ofrecer agregar uno nuevo (depende de T035, T038, T047,
  T048).

**Checkpoint**: US1 a US3 funcionan juntas.

---

## Phase 5: User Story 4 - Consultar el historial de cambios (Priority: P2)

**Goal**: Línea de tiempo de solo lectura con cada cambio (agregado/editado/eliminado),
accesible desde el propio tab (FR-009, FR-010).

**Independent Test**: Marcar, editar y eliminar algunos hallazgos, abrir el historial, y
verificar que cada acción aparece listada con su fecha, ordenada de más reciente a más
antigua (Escenario 4 de `quickstart.md`).

### Tests for User Story 4 (obligatorios) ⚠️

- [X] T050 [P] [US4] Test unitario de `listarHistorialOdontograma` (orden descendente por
  `registradoEn`, mensaje explícito si no hay cambios) en
  `tests/unit/listarHistorialOdontograma.test.ts`.
- [X] T051 [P] [US4] Test e2e del Escenario 4 de `quickstart.md` en
  `tests/e2e/odontograma-historial.spec.ts`.

### Implementation for User Story 4

- [X] T052 [US4] Implementar el caso de uso `listarHistorialOdontograma` en
  `src/application/use-cases/listarHistorialOdontograma.ts` (depende de T008, T014, T017).
- [X] T053 [US4] Implementar `HistorialOdontogramaPanel.tsx` (línea de tiempo de solo
  lectura, paginado, mensaje explícito si está vacío — FR-010) montado en
  `OdontogramaTab.tsx` en `src/components/odontograma/HistorialOdontogramaPanel.tsx`
  (depende de T039, T052).

**Checkpoint**: US1 a US4 funcionan juntas.

---

## Phase 6: User Story 5 - Registrar el plan de tratamiento (Priority: P2)

**Goal**: Tabla estructurada (fecha, diente opcional, tratamiento ejecutado) en el tab
Odontograma, que reemplaza el campo de texto libre equivalente en la pestaña Diagnóstico de
005 (FR-016, FR-017).

**Independent Test**: Agregar una línea con fecha, diente y tratamiento, verificar que
persiste y aparece listada, y confirmar que el campo de texto libre ya no existe en
Diagnóstico (Escenario 5 de `quickstart.md`).

### Tests for User Story 5 (obligatorios) ⚠️

- [X] T054 [P] [US5] Test unitario de `crearItemPlanTratamiento`/
  `editarItemPlanTratamiento`/`eliminarItemPlanTratamiento` (`tratamiento` obligatorio,
  `diente` opcional) en `tests/unit/itemPlanTratamiento.test.ts`.
- [X] T055 [P] [US5] Test de integración de `POST /api/sync` para
  `ITEM_PLAN_TRATAMIENTO`/`CREAR`+`EDITAR`+`ELIMINAR` (incluido conflicto por
  `baseVersion`) en `tests/integration/plan-tratamiento.test.ts`.
- [X] T056 [P] [US5] Test de integración de la migración de datos de `Cita.planTratamiento`
  hacia `ItemPlanTratamiento` (T001) — verifica que ninguna Cita finalizada con plan de
  tratamiento no vacío perdió esa información en
  `tests/integration/migracion-plan-tratamiento.test.ts`.
- [X] T057 [P] [US5] Test e2e del Escenario 5 de `quickstart.md` (alta/edición/eliminación
  de líneas, y que el campo "Plan de tratamiento" ya no aparece en `DiagnosticoTab`) en
  `tests/e2e/odontograma-plan-tratamiento.spec.ts`.

### Implementation for User Story 5

- [X] T058 [US5] Implementar los casos de uso `crearItemPlanTratamiento`,
  `editarItemPlanTratamiento`, `eliminarItemPlanTratamiento`, `listarPlanTratamiento` en
  `src/application/use-cases/` (depende de T009, T015, T018).
- [X] T059 [US5] Crear `PlanTratamientoTabla.tsx` (tabla fecha/diente/tratamiento, alta,
  edición y eliminación de líneas) montada en `OdontogramaTab.tsx` en
  `src/components/odontograma/PlanTratamientoTabla.tsx` (depende de T039, T058).
- [X] T060 [US5] Quitar el campo "Plan de tratamiento" de `DiagnosticoTab.tsx` (FR-017;
  motivo de consulta, diagnóstico y categoría no se tocan) en
  `src/components/citas/DiagnosticoTab.tsx`.

**Checkpoint**: US1 a US5 funcionan juntas.

---

## Phase 7: User Story 6 - Consultar la leyenda de símbolos (Priority: P3)

**Goal**: Leyenda de referencia accesible desde el panel de herramientas, con las 44
condiciones organizadas por categoría (FR-011).

**Independent Test**: Abrir la leyenda y verificar que lista las 8 categorías, cada una
desplegable, con símbolo y color de cada condición (Escenario 6 de `quickstart.md`).

### Tests for User Story 6 (obligatorios) ⚠️

- [X] T061 [P] [US6] Test e2e del Escenario 6 de `quickstart.md` en
  `tests/e2e/odontograma-leyenda.spec.ts`.

### Implementation for User Story 6

- [X] T062 [US6] Crear `LeyendaOdontograma.tsx` (reutiliza `Accordion`; 8 categorías
  desplegables listando cada condición con su `SimboloBadge`/`SimboloGrafico` y color),
  accesible desde `PanelHerramientas.tsx` en
  `src/components/odontograma/LeyendaOdontograma.tsx` (depende de T037, T002).

**Checkpoint**: Las 6 historias de usuario funcionan de forma independiente y en conjunto —
feature completa.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final transversal, incluidos dos requisitos que atraviesan varias
historias (FR-018, FR-019).

- [X] T063 [P] Test e2e del Escenario 7 de `quickstart.md` (solo lectura para paciente
  archivado — hallazgos y plan de tratamiento) en `tests/e2e/odontograma-archivado.spec.ts`.
- [X] T064 Implementar la restricción de solo lectura para paciente archivado en
  `OdontogramaTab.tsx`/`PlanTratamientoTabla.tsx` (reutiliza `puedeEditarse(paciente)` de
  001-gestion-pacientes, FR-019) (depende de T039, T059).
- [X] T065 [P] Test e2e del Escenario 8 de `quickstart.md` (funcionamiento 100% offline,
  sin ninguna de las excepciones de conectividad de 005) en
  `tests/e2e/odontograma-offline.spec.ts`.
- [X] T066 [P] Correr los 8 escenarios de `quickstart.md` de punta a punta manualmente.
- [X] T067 [P] Verificar `OdontogramaTab` (diagrama, panel de herramientas, leyenda,
  historial, tabla de plan de tratamiento) en los tres breakpoints de
  `docs/design-system.md` §4.0 — Principio VI.
- [X] T068 Documentar en `docs/design-system.md`: el sistema de símbolos (`SimboloBadge`/
  `SimboloGrafico`) y la pantalla "Odontograma" (nueva sección, siguiendo el formato de
  §6.15 "Panel de Atención" de 005).
- [X] T069 `tsc --noEmit` y `eslint` limpios en todos los archivos nuevos/modificados de
  este feature.
- [X] T070 [P] Revisar que ninguna operación (conflicto de `version` en `Odontograma`/
  `ItemPlanTratamiento`, rechazo `400` de `EDITAR`/`ELIMINAR` sobre
  `CAMBIO_ODONTOGRAMA`, migración de `Cita.planTratamiento`) se pierda o descarte en
  silencio (Principio III) — queda visible/marcada para que el odontólogo la revise.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Sin dependencias externas — BLOQUEA todas las historias de
  usuario.
- **Historias de usuario (Phase 2 a 7)**: Todas dependen de Foundational.
  - US1 no depende de ninguna otra historia — es el punto de entrada (marcar un hallazgo).
  - US2 (dentición) depende de que `OdontogramaTab`/`DiagramaBoca` ya existan (US1) para
    tener dónde agregar las pestañas, pero su lógica de aislamiento por dentición es
    independiente.
  - US3 (corregir) depende de que existan hallazgos que corregir en la práctica (US1), pero
    su propio código (`editarHallazgo`/`eliminarHallazgo`) es independiente.
  - US4 (historial) depende de que existan cambios que listar en la práctica (US1/US3),
    pero su código (`listarHistorialOdontograma` + panel) es independiente.
  - US5 (plan de tratamiento) es independiente de las demás — no toca `Odontograma`
    (research.md #5) — salvo por su tarea final (T060) que modifica `DiagnosticoTab.tsx` de
    005.
  - US6 (leyenda) depende únicamente del catálogo estático (Foundational) y de
    `PanelHerramientas.tsx` (US1) para montarse.
- **Polish (Phase 8)**: Depende de que las 6 historias estén completas.

### Dentro de cada historia

- Tests (obligatorios) se escriben y deben fallar antes de implementar.
- Caso de uso (`application/use-cases`) antes que el componente de UI que lo consume.
- `OdontogramaTab.tsx` (US1) antes que cualquier panel que se monte dentro (US2 a US6).

### Oportunidades de paralelismo

- T002 a T006 (Foundational, entidades/errores) en paralelo desde el inicio.
- T008, T009 (Foundational, puertos) en paralelo entre sí.
- T014, T015 (Foundational, repos Dexie) y T017, T018 (repos Prisma) en paralelo entre sí.
- Los 4 tests de US1 (T027-T030) en paralelo.
- T033 y T034 (símbolos, US1) en paralelo — archivos distintos.
- Una vez completado US1, **US3, US4 y US5 pueden avanzar en paralelo** entre sí — tocan
  archivos distintos (`editarHallazgo.ts`/`eliminarHallazgo.ts`,
  `listarHistorialOdontograma.ts`, casos de uso de `ItemPlanTratamiento`) sin escritura
  concurrente real sobre el mismo archivo. US2 y US6 dependen de `OdontogramaTab.tsx`/
  `PanelHerramientas.tsx` (US1) pero no entre sí.

---

## Parallel Example: Foundational

```bash
# Al inicio de Foundational, lanzar juntas:
Task: "Crear el catálogo estático CondicionOdontograma (T002)"
Task: "Crear la entidad de dominio Odontograma (T003)"
Task: "Crear la entidad de dominio CambioOdontograma (T004)"
Task: "Crear la entidad de dominio ItemPlanTratamiento (T005)"
Task: "Agregar errores nuevos a errors.ts (T006)"
```

## Parallel Example: User Story 1

```bash
# Los 4 tests de US1 no comparten archivo — lanzar juntos:
Task: "Test unitario de registrarHallazgo (T027)"
Task: "Test unitario de obtenerOCrearOdontograma (T028)"
Task: "Test de integración ODONTOGRAMA/CAMBIO_ODONTOGRAMA (T029)"
Task: "Test e2e del Escenario 1 (T030)"
```

## Parallel Example: US3, US4, US5 (tras completar US1)

```bash
# Tres historias de usuario en paralelo, una vez que OdontogramaTab (US1) existe:
Task: "Implementar editarHallazgo/eliminarHallazgo (US3, T047-T048)"
Task: "Implementar listarHistorialOdontograma + panel (US4, T052-T053)"
Task: "Implementar casos de uso de ItemPlanTratamiento + tabla (US5, T058-T059)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2, ambas P1)

1. Completar Phase 1: Foundational (crítico — bloquea todo)
2. Completar Phase 2: User Story 1
3. Completar Phase 3: User Story 2
4. **Detener y validar**: probar US1+US2 de forma independiente (Escenarios 1 y 2 de
   `quickstart.md`), incluido el caso offline
5. El odontólogo ya puede marcar hallazgos en ambas denticiones — el núcleo del odontograma
   es demostrable

### Entrega incremental

1. Foundational → base lista (`Odontograma`/`CambioOdontograma`/`ItemPlanTratamiento` de
   punta a punta)
2. US1 → validar → demo (marcar un hallazgo)
3. US2 → validar → demo (dentición Adulto/Niño) — **MVP completo**
4. US3 → validar → demo (corregir hallazgos)
5. US4 → validar → demo (historial de cambios)
6. US5 → validar → demo (plan de tratamiento, reemplaza el campo de 005)
7. US6 → validar → demo (leyenda)
8. Polish → validación de punta a punta (offline, solo lectura archivado, responsive)

### Parallel Team Strategy

Con varios desarrolladores:

1. El equipo completa Foundational y US1 juntos (crítico, bloquea todo lo demás).
2. Una vez que `OdontogramaTab.tsx` existe (US1):
   - Desarrollador A: US2 (dentición)
   - Desarrollador B: US3 (corregir) + US4 (historial)
   - Desarrollador C: US5 (plan de tratamiento)
   - Desarrollador D: US6 (leyenda)
3. Polish se integra al final, con todas las historias ya demostrables.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- Verificar que los tests fallan antes de implementar.
- Commit después de cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
- Evitar: tareas vagas, conflictos de archivo entre historias, dependencias cruzadas que
  rompan la independencia de cada historia.
