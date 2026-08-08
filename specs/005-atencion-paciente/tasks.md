---

description: "Task list for Atención de Paciente (Cita Clínica) (005-atencion-paciente)"
---

# Tasks: Atención de Paciente (Cita Clínica)

**Input**: Design documents from `/specs/005-atencion-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige tests que fallen, escritos antes del código de implementación. Cada
fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente. El spec define 8 historias
(US1/US2 = P1, US3/US4/US5 = P2, US6/US7 = P3, US8 = P4); dentro de una misma prioridad se
respeta el orden en que aparecen en spec.md.

**Nota sobre alcance**: esta feature extiende `001-gestion-pacientes` (botón en la ficha),
`003-historia-clinica-paciente` (reutiliza `editarPaciente` para Antecedentes, sin
duplicar) y el motor de sync ya generalizado en `004-consultorios`. Reutiliza componentes
de UI existentes (`Tabs`, `Modal`, `Input`, `Textarea`, `Select`, `Button`, `Card`, `Badge`,
`Checkbox` — `docs/design-system.md` §6) y agrega dos nuevos (`Accordion`, `FileInput`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1 a US8)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/components/`, `src/app/`, `prisma/`,
`tests/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: La entidad `Cita` de punta a punta (dominio → Dexie → Prisma → API → sync) y
`ArchivoEstudio` (solo servidor). Ninguna historia de usuario puede demostrarse sin esto —
incluso US1 por sí sola exige que crear/reabrir una cita funcione offline y sincronice
(FR-002 a FR-004, FR-020).

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T001 Migración de Prisma en `prisma/schema.prisma`: enums `EstadoCita`
  (`EN_CURSO`/`FINALIZADA`), `CategoriaConsulta` (10 valores, research.md #12),
  `TipoArchivoEstudio` (`IMAGEN`/`PDF`); modelo `Cita` (`id`, `pacienteId` FK, `estado`,
  `categoria?`, `motivoConsulta?`, `diagnostico?`, `planTratamiento?`, `recetaItems Json`,
  `estudioItems Json`, `version`, `conflictoPendiente Json?`, `finalizadaEn?`, timestamps,
  `@@index([pacienteId, estado])`); modelo `ArchivoEstudio` (`id`, `citaId` FK
  `onDelete: Cascade`, `estudioItemId`, `nombreArchivo`, `tipo`, `contenido Bytes`,
  `createdAt`) (`data-model.md`, research.md #1 a #4). Aplicar con
  `npx prisma migrate dev` contra una base real.
- [X] T002 [P] Crear la entidad de dominio `Cita` (`Cita`, `ItemReceta`, `EstudioItem`,
  `ArchivoEstudioMeta`, `EstadoCita`, `CategoriaConsulta`, `DatosNuevaCita`,
  `crearCitaDesdeDatos()`, `puedeEditarseCita()`) en `src/domain/entities/Cita.ts`
  (`data-model.md`).
- [X] T003 [P] Crear la entidad de dominio `ArchivoEstudio` (solo servidor, incluye
  `contenido`) en `src/domain/entities/ArchivoEstudio.ts`.
- [X] T004 [P] Agregar `CitaFinalizadaError`, `EstudioNoEncontradoError` y
  `TipoArchivoNoSoportadoError` en `src/domain/errors.ts`, mismo patrón que
  `PacienteArchivadoError`/`NombreConsultorioDuplicadoError`.
- [X] T005 Crear la interfaz `ICitaRepository` (`crearOAbrir`, `obtenerPorId`,
  `listarPorPaciente`, `editar`, `finalizar`) en
  `src/domain/repositories/ICitaRepository.ts` (depende de T002).
- [X] T006 [P] Crear la interfaz `IArchivoEstudioRepository` (`agregar`,
  `obtenerContenido`) en `src/domain/repositories/IArchivoEstudioRepository.ts` (depende de
  T003) — sin contraparte Dexie, mismo patrón que `IUsuarioRepository` (research.md #5).
- [X] T007 [P] Crear `citaDto.ts` (Zod): `categoriaConsultaSchema`, `itemRecetaSchema`
  (medicamento/dosis/frecuencia/duracion obligatorios, indicaciones opcional),
  `estudioItemSchema` (nombre obligatorio), `crearCitaInputSchema`,
  `editarCitaInputSchema` en `src/application/dto/citaDto.ts`.
- [X] T008 Extender `operacionSyncSchema` en `src/application/dto/syncDto.ts`: nuevo
  miembro de la unión discriminada `entidad: "CITA"` con `tipo: "CREAR" | "EDITAR" |
  "FINALIZAR"`, `baseVersion` obligatorio solo para `EDITAR`/`FINALIZAR`
  (`contracts/citas-api.md`) (depende de T007).
- [X] T009 Generalizar `db.ts` (Dexie) en `src/infrastructure/db/dexie/db.ts`:
  `this.version(5)` agrega tabla `citas: "id, pacienteId, estado, [pacienteId+estado]"`
  y extiende `EntidadOutbox` a `"PACIENTE" | "CONSULTORIO" | "CITA"` (data-model.md
  §OutboxOperation, research.md #8) (depende de T002).
- [X] T010 Implementar `CitaRepositoryDexie` (`crearOAbrir`: busca localmente
  `pacienteId`+`estado="EN_CURSO"` antes de crear, research.md #6; `editar`: rechaza si
  `estado="FINALIZADA"` con `CitaFinalizadaError`, valida con `citaDto`, encola `EDITAR`;
  `finalizar`: encola `FINALIZAR`; `listarPorPaciente`; `obtenerPorId`) en
  `src/infrastructure/db/dexie/CitaRepositoryDexie.ts` (depende de T005, T009).
- [X] T011 Implementar `CitaRepositoryPrisma` (`crearOAbrir`: idempotente por `id` +
  reconciliación servidor de "una cita en curso" por `pacienteId`, research.md #6;
  `editar`: mismo mecanismo `version`/`conflictoPendiente` que `PacienteRepositoryPrisma`,
  rechaza con `CitaFinalizadaError` si `estado="FINALIZADA"`; `finalizar`: idempotente;
  `listarPorPaciente`: `select` explícito sin `ArchivoEstudio.contenido`, research.md #13)
  en `src/infrastructure/db/prisma/CitaRepositoryPrisma.ts` (depende de T001, T005).
- [X] T012 Implementar `ArchivoEstudioRepositoryPrisma` (`agregar`: valida que
  `estudioItemId` exista dentro de `Cita.estudioItems`, resuelve `tipo` desde el MIME
  recibido o lanza `TipoArchivoNoSoportadoError`, guarda `contenido`, devuelve metadata +
  Cita actualizada; `obtenerContenido`: valida que el archivo pertenezca a
  `citaId`+`estudioItemId` indicados) en
  `src/infrastructure/db/prisma/ArchivoEstudioRepositoryPrisma.ts` (depende de T001, T006).
- [X] T013 Implementar `GET /api/citas/[id]/route.ts` (detalle completo, incluida la
  metadata de archivos por estudio) per `contracts/citas-api.md` (depende de T011).
- [X] T014 Implementar `GET /api/patients/[id]/citas/route.ts` (historial filtrable por
  `estado`, pull incremental por `desde`, paginado) per `contracts/citas-api.md` (depende
  de T011).
- [X] T015 Extender `POST /api/sync` en `src/app/api/sync/route.ts`: `aplicarOperacionCita`
  (`CREAR` idempotente + reabre `EN_CURSO` existente; `EDITAR` con `baseVersion` →
  `CONFLICTO`/`RECHAZADO CITA_FINALIZADA`; `FINALIZAR` idempotente), dispatch por
  `entidad === "CITA"`, incluye `PACIENTE_ARCHIVADO` si el paciente ya no está activo
  (`contracts/citas-api.md`) (depende de T008, T011).
- [X] T016 Extender `syncEngine.ts`: `pullCitasDesdeServidor()` (incremental por
  `updatedAt`, mismo criterio que `pullCambiosDesdeServidor` de `Paciente` — no el pull
  completo de `Consultorio`, research.md #13), aplicar `resultado.cita` en
  `sincronizarLote`, invocar desde `ejecutarCicloDeSync` en
  `src/infrastructure/sync/syncEngine.ts` (depende de T009, T014, T015).

**Checkpoint**: Con Foundational completo, `Cita` existe de punta a punta (dominio → Dexie
→ Prisma → API → sync) y `ArchivoEstudio` existe del lado servidor — las historias de
usuario pueden empezar.

---

## Phase 2: User Story 1 - Iniciar la atención de un paciente (Priority: P1) 🎯 MVP

**Goal**: Botón "Nueva cita" / "Atender paciente" en la ficha de un paciente activo que
crea (o reabre) una Cita en curso y abre de inmediato el panel de Atención (FR-001 a
FR-004).

**Independent Test**: Desde la ficha de un paciente activo, presionar el botón y verificar
que se crea una Cita `EN_CURSO` y se abre el panel; volver a presionarlo y verificar que
reabre la misma Cita; confirmar que el botón no existe en un paciente archivado (Escenario
1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

- [X] T017 [P] [US1] Test unitario de `crearOAbrirCita` (crea si no hay ninguna
  `EN_CURSO`, reabre la existente en vez de duplicar, rechaza si el paciente está
  archivado) en `tests/unit/crearOAbrirCita.test.ts`.
- [X] T018 [P] [US1] Test de integración de `POST /api/sync` para `CITA`/`CREAR`
  (idempotencia por `id`, reconciliación servidor de "una cita en curso" cuando dos `id`
  distintos apuntan al mismo `pacienteId`, `PACIENTE_ARCHIVADO`) en
  `tests/integration/citas-crear.test.ts`.
- [X] T019 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` (botón visible/ausente
  según estado del paciente, crea y abre el panel, reabre la cita en curso existente) en
  `tests/e2e/atencion-iniciar.spec.ts`.

### Implementation for User Story 1

- [X] T020 [US1] Implementar el caso de uso `crearOAbrirCita` en
  `src/application/use-cases/crearOAbrirCita.ts` (usa `ICitaRepository`, verifica
  `puedeEditarse(paciente)` antes de crear) (depende de T005, T010, T011).
- [X] T021 [US1] Crear el componente `Accordion` (dos secciones colapsables
  independientes, foco/aria-expanded per `docs/design-system.md` §4.1) en
  `src/components/ui/Accordion.tsx` / `Accordion.module.css`.
- [X] T022 [US1] Crear `OdontogramaTab.tsx` — placeholder deshabilitado "Próximamente",
  sin funcionalidad (FR-013) en `src/components/citas/OdontogramaTab.tsx`.
- [X] T023 [US1] Crear `PanelAtencion.tsx` (shell: `Tabs` central con Diagnóstico/Receta/
  Estudios como stubs vacíos + Odontograma vía T022; `Accordion` lateral con secciones
  "Antecedentes"/"Historial de citas anteriores" vacías por ahora; responsive — en
  `<640px` el `Accordion` se abre en un `Modal` a pantalla completa, FR-025) en
  `src/components/citas/PanelAtencion.tsx` (depende de T021, T022).
- [X] T024 [US1] Crear la ruta `src/app/(shell)/citas/[id]/page.tsx` — carga la `Cita` con
  `useLiveQuery`/`CitaRepositoryDexie`, renderiza `PanelAtencion` (depende de T010, T023).
- [X] T025 [US1] Agregar el botón "Nueva cita" / "Atender paciente" al `CardFooter` de
  `src/app/(shell)/pacientes/[id]/page.tsx` — visible solo si `!archivado`, llama
  `crearOAbrirCita` y navega a `/citas/[id]` (depende de T020, T024).

**Checkpoint**: US1 funcional de punta a punta, incluso sin conexión — el odontólogo ya
puede iniciar/reabrir una atención desde la ficha del paciente.

---

## Phase 3: User Story 2 - Registrar el diagnóstico de la consulta (Priority: P1)

**Goal**: Motivo de consulta, diagnóstico, plan de tratamiento y categoría, editables
mientras la cita está en curso (FR-005, FR-006).

**Independent Test**: Con una cita en curso abierta, completar los cuatro campos, guardar,
recargar y confirmar que persisten; confirmar que se puede guardar con todos vacíos
(Escenario 2 de `quickstart.md`, parte diagnóstico).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T026 [P] [US2] Test unitario de `editarCita` para
  `motivoConsulta`/`diagnostico`/`planTratamiento`/`categoria` (persiste parcial, permite
  todos vacíos, rechaza si `estado="FINALIZADA"`) en `tests/unit/editarCita.test.ts`.
- [X] T027 [P] [US2] Test de integración de `POST /api/sync` para `CITA`/`EDITAR` de
  estos campos (conflicto por `baseVersion`) en `tests/integration/citas-editar.test.ts`.
- [X] T028 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` (parte diagnóstico) en
  `tests/e2e/atencion-diagnostico.spec.ts`.

### Implementation for User Story 2

- [X] T029 [US2] Implementar el caso de uso `editarCita` en
  `src/application/use-cases/editarCita.ts` (valida con `citaDto`, usa `ICitaRepository`)
  (depende de T007, T010, T011).
- [X] T030 [P] [US2] Crear `categoriaConsultaOpciones.ts` (catálogo de 10 opciones +
  labels, research.md #12) en `src/components/pacientes/categoriaConsultaOpciones.ts`.
- [X] T031 [US2] Implementar `DiagnosticoTab.tsx` (Textarea de motivo/diagnóstico/plan,
  Select de categoría, llama `editarCita`) montado en el tab "Diagnóstico" de
  `PanelAtencion` en `src/components/citas/DiagnosticoTab.tsx` (depende de T023, T029,
  T030).

**Checkpoint**: US1 y US2 funcionan juntas — se puede iniciar una atención y registrar su
diagnóstico.

---

## Phase 4: User Story 3 - Indicar receta médica (Priority: P2)

**Goal**: Agregar/quitar ítems de receta (medicamento, dosis, frecuencia, duración,
indicaciones opcionales) mientras la cita está en curso (FR-007, FR-008).

**Independent Test**: Agregar un ítem, agregar un segundo, quitar el primero y confirmar
que solo queda el segundo; guardar sin ítems y confirmar que se permite (Escenario 2 de
`quickstart.md`, parte receta).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T032 [P] [US3] Test unitario de `editarCita` sobre `recetaItems` (agrega, quita,
  valida campos obligatorios del ítem) — extender `tests/unit/editarCita.test.ts`.
- [X] T033 [P] [US3] Test e2e del Escenario 2 de `quickstart.md` (parte receta) en
  `tests/e2e/atencion-receta.spec.ts`.

### Implementation for User Story 3

- [X] T034 [US3] Implementar `RecetaTab.tsx` (lista de `ItemReceta`, formulario de alta de
  ítem, botón quitar por fila, llama `editarCita`) montado en el tab "Receta" de
  `PanelAtencion` en `src/components/citas/RecetaTab.tsx` (depende de T023, T029).

**Checkpoint**: US1, US2 y US3 funcionan juntas.

---

## Phase 5: User Story 4 - Indicar estudios complementarios (Priority: P2)

**Goal**: Agregar/quitar estudios solicitados (nombre/descripción) mientras la cita está en
curso (FR-009, FR-010) — sin adjuntos todavía (eso es US8).

**Independent Test**: Agregar un estudio, quitar uno existente, guardar sin ninguno
(Escenario 2 de `quickstart.md`, parte estudios).

### Tests for User Story 4 (obligatorios) ⚠️

- [X] T035 [P] [US4] Test unitario de `editarCita` sobre `estudioItems` (agrega, quita,
  valida `nombre` obligatorio) — extender `tests/unit/editarCita.test.ts`.
- [X] T036 [P] [US4] Test e2e del Escenario 2 de `quickstart.md` (parte estudios) en
  `tests/e2e/atencion-estudios.spec.ts`.

### Implementation for User Story 4

- [X] T037 [US4] Implementar `EstudiosTab.tsx` (lista de `EstudioItem`, formulario de alta,
  botón quitar por fila, llama `editarCita`; sin subida de archivos todavía) montado en el
  tab "Estudios" de `PanelAtencion` en `src/components/citas/EstudiosTab.tsx` (depende de
  T023, T029).

**Checkpoint**: US1 a US4 funcionan juntas — el contenido clínico central de la atención
está completo.

---

## Phase 6: User Story 5 - Consultar y editar antecedentes durante la atención (Priority: P2)

**Goal**: Ver y editar la historia clínica del paciente (003-historia-clinica-paciente)
desde el acordeón "Antecedentes" del panel de Atención, sin salir de la atención en curso
(FR-011, FR-012).

**Independent Test**: Abrir Antecedentes, ver los datos ya cargados del paciente, editar
uno, confirmar que se refleja también en la ficha del paciente fuera de la atención, y que
Diagnóstico/Receta/Estudios no pierden lo ya cargado (Escenario 3 de `quickstart.md`).

### Tests for User Story 5 (obligatorios) ⚠️

- [X] T038 [P] [US5] Test e2e del Escenario 3 de `quickstart.md` (ver antecedentes
  existentes, editar y verificar reflejo en la ficha del paciente, no perder datos de
  otros tabs al navegar) en `tests/e2e/atencion-antecedentes.spec.ts`.

### Implementation for User Story 5

- [X] T039 [US5] Implementar `AntecedentesPanel.tsx` (reutiliza `Checkbox`/`Textarea`/
  `antecedentesPatologicosOpciones` ya existentes de `003-historia-clinica-paciente`,
  llama a `editarPaciente` — sin modelo nuevo, FR-011) montado en la sección "Antecedentes"
  del `Accordion` de `PanelAtencion` en `src/components/citas/AntecedentesPanel.tsx`
  (depende de T023). Disponible independientemente de `Cita.estado` (FR-012).

**Checkpoint**: US1 a US5 funcionan juntas.

---

## Phase 7: User Story 6 - Finalizar la atención (Priority: P3)

**Goal**: Botón "Finalizar atención" que bloquea la edición de motivo, diagnóstico, plan de
tratamiento, categoría, receta y nombre/descripción de estudios (FR-014 a FR-016).

**Independent Test**: Finalizar una cita con datos cargados, confirmar que los campos
pasan a solo lectura y que una edición posterior se rechaza; confirmar que no existe
acción de "reabrir" (Escenario 4 de `quickstart.md`).

### Tests for User Story 6 (obligatorios) ⚠️

- [X] T040 [P] [US6] Test unitario de `finalizarCita` (idempotente si ya está
  `FINALIZADA`) en `tests/unit/finalizarCita.test.ts`.
- [X] T041 [P] [US6] Test de integración: `POST /api/sync` `CITA`/`FINALIZAR`, y que una
  operación `EDITAR` posterior sobre esa misma Cita se rechaza con `CITA_FINALIZADA` — en
  `tests/integration/citas-finalizar.test.ts`.
- [X] T042 [P] [US6] Test e2e del Escenario 4 de `quickstart.md` en
  `tests/e2e/atencion-finalizar.spec.ts`.

### Implementation for User Story 6

- [X] T043 [US6] Implementar el caso de uso `finalizarCita` en
  `src/application/use-cases/finalizarCita.ts` (depende de T005, T010, T011).
- [X] T044 [US6] Agregar el botón "Finalizar atención" a `PanelAtencion.tsx` y deshabilitar
  (solo lectura) los campos de `DiagnosticoTab`/`RecetaTab`/`EstudiosTab` cuando
  `cita.estado === "FINALIZADA"` (depende de T023, T031, T034, T037, T043).

**Checkpoint**: US1 a US6 funcionan juntas — el ciclo completo de una atención (iniciar →
cargar → finalizar) ya es demostrable.

---

## Phase 8: User Story 7 - Consultar el historial de citas anteriores (Priority: P3)

**Goal**: Acordeón "Historial de citas anteriores" que lista las citas finalizadas del
paciente y permite abrir cualquiera en modo solo lectura (FR-021 a FR-024).

**Independent Test**: Con un paciente que tiene citas finalizadas, abrir una atención
nueva, desplegar el historial, confirmar que la cita en curso actual no aparece, abrir una
cita listada y verla completa en solo lectura; con un paciente sin citas anteriores,
confirmar el mensaje de "sin citas" (Escenario 5 de `quickstart.md`).

### Tests for User Story 7 (obligatorios) ⚠️

- [X] T045 [P] [US7] Test unitario de `listarCitasPaciente` (filtra `FINALIZADA` por
  defecto, excluye la cita en curso actual) en `tests/unit/listarCitasPaciente.test.ts`.
- [X] T046 [P] [US7] Test e2e del Escenario 5 de `quickstart.md` en
  `tests/e2e/atencion-historial.spec.ts`.

### Implementation for User Story 7

- [X] T047 [US7] Implementar el caso de uso `listarCitasPaciente` en
  `src/application/use-cases/listarCitasPaciente.ts` (depende de T005, T010, T011).
- [X] T048 [US7] Implementar `HistorialCitasPanel.tsx` (lista ordenada de más reciente a
  más antigua, mensaje explícito si está vacía, FR-024) montado en la sección "Historial de
  citas anteriores" del `Accordion` de `PanelAtencion` en
  `src/components/citas/HistorialCitasPanel.tsx` (depende de T023, T047).
- [X] T049 [US7] Implementar `CitaDetalleSoloLectura.tsx` (diagnóstico, receta, estudios —
  sin archivos todavía, eso es US8 — en modo solo lectura), abierto al seleccionar una cita
  del historial en `src/components/citas/CitaDetalleSoloLectura.tsx` (depende de T048).

**Checkpoint**: US1 a US7 funcionan juntas.

---

## Phase 9: User Story 8 - Adjuntar resultado a un estudio después de finalizada la cita (Priority: P4)

**Goal**: Subir uno o más archivos (imagen/PDF) a un estudio existente, incluso con la
cita finalizada, en un endpoint online-only fuera del outbox (FR-017 a FR-019).

**Independent Test**: Con una cita finalizada y un estudio solicitado, adjuntar un archivo
con conexión → aparece listado; intentar un tipo no soportado → se rechaza; sin conexión →
se informa y no se pierde nada (Escenario 6 de `quickstart.md`).

### Tests for User Story 8 (obligatorios) ⚠️

- [X] T050 [P] [US8] Test unitario de `agregarArchivoEstudio` (rechaza tipo no soportado,
  rechaza `estudioItemId` inexistente, funciona con la cita `FINALIZADA`) en
  `tests/unit/agregarArchivoEstudio.test.ts`.
- [X] T051 [P] [US8] Test de integración de `POST`/`GET` de
  `contracts/archivos-estudio-api.md` (subida exitosa devuelve la Cita actualizada,
  descarga valida que el archivo pertenezca a esa Cita/Estudio) en
  `tests/integration/archivos-estudio.test.ts`.
- [X] T052 [P] [US8] Test e2e del Escenario 6 de `quickstart.md`, incluida la red
  deshabilitada/rehabilitada a mitad de flujo, en `tests/e2e/atencion-archivos.spec.ts`.

### Implementation for User Story 8

- [X] T053 [US8] Implementar el caso de uso `agregarArchivoEstudio` en
  `src/application/use-cases/agregarArchivoEstudio.ts` (depende de T006, T012).
- [X] T054 [US8] Implementar
  `POST /api/citas/[id]/estudios/[estudioItemId]/archivos/route.ts` (multipart, valida
  Cita/Estudio/tipo, online-only, fuera del outbox) per
  `contracts/archivos-estudio-api.md` (depende de T012, T053).
- [X] T055 [US8] Implementar
  `GET /api/citas/[id]/estudios/[estudioItemId]/archivos/[archivoId]/route.ts` (descarga,
  control de acceso a nivel de registro — Principio VII) per
  `contracts/archivos-estudio-api.md` (depende de T012).
- [X] T056 [P] [US8] Crear el componente `FileInput` (selector de imagen/PDF con
  validación de tipo en el cliente) en `src/components/ui/FileInput.tsx` /
  `FileInput.module.css`.
- [X] T057 [US8] Integrar `FileInput` en `EstudiosTab.tsx` (adjuntar a un estudio existente,
  incluso con la cita finalizada) y en `CitaDetalleSoloLectura.tsx` (adjuntar desde el
  historial); deshabilitar la acción si `navigator.onLine === false` (FR-019) (depende de
  T037, T049, T054, T056).

**Checkpoint**: Las 8 historias de usuario funcionan de forma independiente y en conjunto —
feature completa.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final transversal.

- [X] T058 [P] Correr los 6 escenarios de `quickstart.md` de punta a punta manualmente.
- [X] T059 [P] Verificar `PanelAtencion` (tabs + acordeón lateral, y su colapso a `Modal`
  en mobile) en los tres breakpoints de `docs/design-system.md` §4.0 — Principio VI.
- [X] T060 Documentar `Accordion` y `FileInput` en `docs/design-system.md` (§6.13), más la
  variante de pantalla "Panel de Atención" (tabs + acordeón lateral).
- [X] T061 `tsc --noEmit` y `eslint` limpios en todos los archivos nuevos/modificados de
  este feature.
- [X] T062 [P] Revisar que ninguna operación `CITA` (edición rechazada por
  `CITA_FINALIZADA`, conflicto de `version`, o una subida de archivo fallida) se pierda o
  descarte en silencio (Principio III) — queda visible/marcada para que el odontólogo la
  revise, igual que ya ocurre con `DOCUMENTO_DUPLICADO`/`NOMBRE_DUPLICADO`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Sin dependencias externas — BLOQUEA todas las historias de
  usuario.
- **Historias de usuario (Phase 2 a 9)**: Todas dependen de Foundational.
  - US1 no depende de ninguna otra historia — es el punto de entrada (crea/abre el panel).
  - US2, US3, US4, US5 dependen de que `PanelAtencion`/la ruta `/citas/[id]` ya existan
    (US1) para tener dónde montarse, pero son independientes entre sí (tabs/acordeón
    distintos, mismo archivo `editarCita` reutilizado sin conflicto real de contenido).
  - US6 (finalizar) depende de que exista algo que finalizar — se apoya en US2/US3/US4
    para tener sentido de prueba, pero su propio código (`finalizarCita` + deshabilitar
    inputs) es independiente.
  - US7 (historial) depende de US6 para tener citas *finalizadas* que listar en la
    práctica, aunque su código (`listarCitasPaciente` + panel) es independiente.
  - US8 (archivos) depende de US4 (existan estudios) y US6/US7 (una cita finalizada a la
    que adjuntar) para su prueba end-to-end completa, aunque el subsistema en sí
    (`ArchivoEstudio`, ya resuelto en Foundational) es independiente.
- **Polish (Phase 10)**: Depende de que las 8 historias estén completas.

### Dentro de cada historia

- Tests (obligatorios) se escriben y deben fallar antes de implementar.
- Caso de uso (`application/use-cases`) antes que el componente de UI que lo consume.
- `PanelAtencion`/ruta (US1) antes que cualquier tab/acordeón que se monte dentro.

### Oportunidades de paralelismo

- T002, T003, T004 (Foundational) en paralelo desde el inicio.
- T006, T007 (Foundational) en paralelo entre sí.
- Los 3 tests de US1 (T017-T019) en paralelo.
- T021 y T022 (Foundational de UI dentro de US1: `Accordion`, `OdontogramaTab`) en paralelo.
- Una vez completado US1, **US2, US3, US4 y US5 pueden avanzar en paralelo** entre sí —
  tocan archivos de tab distintos (`DiagnosticoTab.tsx`, `RecetaTab.tsx`,
  `EstudiosTab.tsx`, `AntecedentesPanel.tsx`) y comparten `editarCita`/`PanelAtencion`
  solo por lectura de tipos, sin escritura concurrente real sobre el mismo archivo.
- T056 (`FileInput`, US8) es independiente de T053-T055 (backend de archivos) — se puede
  construir en paralelo.

---

## Parallel Example: Foundational

```bash
# Al inicio de Foundational, lanzar juntas:
Task: "Crear la entidad de dominio Cita (T002)"
Task: "Crear la entidad de dominio ArchivoEstudio (T003)"
Task: "Agregar CitaFinalizadaError y errores relacionados (T004)"
```

## Parallel Example: User Story 1

```bash
# Los 3 tests de US1 no comparten archivo — lanzar juntos:
Task: "Test unitario de crearOAbrirCita (T017)"
Task: "Test de integración CITA/CREAR (T018)"
Task: "Test e2e del Escenario 1 (T019)"
```

## Parallel Example: US2 a US5 (tras completar US1)

```bash
# Cuatro historias de usuario en paralelo, una vez que PanelAtencion (US1) existe:
Task: "Implementar DiagnosticoTab.tsx (US2, T031)"
Task: "Implementar RecetaTab.tsx (US3, T034)"
Task: "Implementar EstudiosTab.tsx (US4, T037)"
Task: "Implementar AntecedentesPanel.tsx (US5, T039)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Foundational (crítico — bloquea todo, incluye `Cita` de punta a
   punta y la extensión del motor de sync)
2. Completar Phase 2: User Story 1
3. **Detener y validar**: probar US1 de forma independiente (Escenario 1 de
   `quickstart.md`), incluido el caso offline
4. El odontólogo ya puede iniciar/reabrir una atención desde la ficha del paciente, aunque
   el panel todavía no tenga contenido clínico cargable

### Entrega incremental

1. Foundational → base lista (`Cita` de punta a punta)
2. US1 → validar → demo (iniciar/reabrir la atención)
3. US2 → validar → demo (diagnóstico)
4. US3 → validar → demo (receta)
5. US4 → validar → demo (estudios)
6. US5 → validar → demo (antecedentes en el panel de Atención)
7. US6 → validar → demo (finalizar atención)
8. US7 → validar → demo (historial de citas anteriores)
9. US8 → validar → demo (adjuntar resultado, incluida cita finalizada)
10. Polish → validación de punta a punta

### Parallel Team Strategy

Con varios desarrolladores:

1. El equipo completa Foundational y US1 juntos (crítico, bloquea todo lo demás).
2. Una vez que `PanelAtencion`/la ruta `/citas/[id]` existen (US1):
   - Desarrollador A: US2 (Diagnóstico)
   - Desarrollador B: US3 (Receta)
   - Desarrollador C: US4 (Estudios)
   - Desarrollador D: US5 (Antecedentes)
3. US6 (Finalizar) y US7 (Historial) se integran después, ya que su prueba completa se
   apoya en que haya contenido cargado por US2-US4.
4. US8 (Archivos) se integra al final, apoyándose en US4 (estudios existentes) y
   US6/US7 (una cita finalizada).

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- Verificar que los tests fallan antes de implementar.
- Commit después de cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
- Evitar: tareas vagas, conflictos de archivo entre historias, dependencias cruzadas que
  rompan la independencia de cada historia.
