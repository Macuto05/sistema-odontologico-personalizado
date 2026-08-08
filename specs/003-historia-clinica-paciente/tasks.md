---

description: "Task list for Historia Clínica del Paciente (003-historia-clinica-paciente)"
---

# Tasks: Historia Clínica del Paciente

**Input**: Design documents from `/specs/003-historia-clinica-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige tests que fallen, escritos antes del código de implementación. Cada
fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota sobre alcance**: esta feature extiende la entidad `Paciente` y el formulario/ficha ya
construidos en `001-gestion-pacientes` — no agrega capas, servicios ni endpoints nuevos
(ver `plan.md` §Constitution Check, `research.md` #1 y #7). Por eso no hay una fase de
Setup propia: se reutiliza íntegramente la inicialización de proyecto, dependencias y
tooling de 001. La numeración de tareas empieza directamente en Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js de 001 (ver `plan.md` §Project Structure): `src/domain/`,
`src/application/`, `src/infrastructure/`, `src/components/`, `src/app/`, `prisma/`,
`docs/`, `tests/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extender la entidad `Paciente` (dominio, Prisma, Dexie, DTOs) y crear los
componentes de UI (`Checkbox`, `Textarea`) que las 3 historias de usuario necesitan. Ninguna
historia toca datos ni pantallas propias hasta que esto esté completo — todas leen/escriben
los mismos 4 campos de la misma entidad (`data-model.md`).

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T001 [P] Agregar el enum `AntecedentePatologico` (21 valores, `data-model.md`) y los 4
  campos nuevos (`antecedentesPatologicos`, `antecedentesPatologicosOtros`,
  `antecedentesHeredofamiliares`, `medicamentosActuales`, `alergias`) a la entidad de
  dominio `Paciente` en `src/domain/entities/Paciente.ts`, incluidos en
  `DatosNuevoPaciente` y con sus defaults (`[]` / `null`) en `crearPacienteDesdeDatos`.
- [X] T002 [P] Extender `DatosEdicionPaciente` con los mismos 4 campos (opcionales) en
  `src/domain/repositories/IPacienteRepository.ts`.
- [X] T003 [P] Extender `crearPacienteInputSchema` (y por herencia `editarPacienteInputSchema`)
  en `src/application/dto/pacienteDto.ts`: `antecedentePatologicoSchema` (enum Zod de 21
  valores), `antecedentesPatologicos` (array, default `[]`), y
  `antecedentesPatologicosOtros`/`antecedentesHeredofamiliares`/`medicamentosActuales`/
  `alergias` (string, `trim()`, cadena vacía tras el trim → `null`, FR-004).
- [X] T004 Migración de Prisma en `prisma/schema.prisma`: enum `AntecedentePatologico` (21
  valores) + columnas `antecedentesPatologicos AntecedentePatologico[] @default([])`,
  `antecedentesPatologicosOtros String?`, `antecedentesHeredofamiliares String?`,
  `medicamentosActuales String?`, `alergias String?` en el modelo `Paciente` (depende de
  T001). Aplicar con `npx prisma migrate dev` contra una base real — migración aditiva, sin
  backfill (research.md #4).
- [X] T005 [P] Mapear los 4 campos nuevos en `PacienteRepositoryPrisma.ts` (`aDominio`,
  `crear`, `editar`) en `src/infrastructure/db/prisma/PacienteRepositoryPrisma.ts` (depende
  de T004).
- [X] T006 [P] Bump de Dexie a `this.version(3)` (aditivo, sin índices nuevos — estos campos
  no se buscan/filtran en esta feature) en `src/infrastructure/db/dexie/db.ts` (depende de
  T001).
- [X] T007 [P] Mapear los 4 campos nuevos en `editar()` de `PacienteRepositoryDexie.ts`
  (`crear()` ya los cubre vía `crearPacienteDesdeDatos`) en
  `src/infrastructure/db/dexie/PacienteRepositoryDexie.ts` (depende de T001, T006).
- [X] T008 [P] Crear catálogo de opciones en
  `src/components/pacientes/antecedentesPatologicosOpciones.ts`: las 21 opciones del enum +
  etiqueta legible en español para cada una, en el orden del checklist de FR-002 (Diabetes,
  Hepatitis, Artritis, Asma/EPOC, Anemia, Infarto, Enfermedades Pulmonares, Hipertiroidismo,
  Hipotiroidismo, Convulsiones/Desmayos, Hipertensión/Hipotensión, Sinusitis, Angina de
  Pecho, Fiebre Reumática, Gastritis, Úlcera Gástrica, Enfermedades de Transmisión Sexual,
  Arteriosclerosis, Alteraciones metabólicas, Enfermedades Endocrinas, Osteoporosis).
- [X] T009 [P] Crear componente `Checkbox` reutilizable (`src/components/ui/Checkbox.tsx` +
  `Checkbox.module.css`) — mismos tokens de borde/foco/error que `Input` (§6.2), label
  asociado vía `useId()` (mismo patrón de accesibilidad que `Input.tsx`), área táctil
  ≥44×44px (Principio VI).
- [X] T010 [P] Crear componente `Textarea` reutilizable (`src/components/ui/Textarea.tsx` +
  `Textarea.module.css`) — variante multilínea de `Input`, mismos tokens de
  borde/foco/error/label.
- [X] T011 Documentar `Checkbox` y `Textarea` en `docs/design-system.md` §6.2, y agregar la
  sección "Historia clínica" (grilla responsive del checklist: 3 columnas en escritorio, 2
  en tablet, 1 en celular — mismo criterio que §6.11) a §6.11 (formulario) y §6.12 (ficha)
  (depende de T009, T010).

**Checkpoint**: Con Foundational completo, las 3 historias de usuario pueden empezar — todas
comparten la misma entidad extendida, el mismo schema de validación y los mismos
componentes de UI, sin reimplementarlos.

---

## Phase 2: User Story 1 - Registrar la historia clínica al dar de alta (Priority: P1) 🎯 MVP

**Goal**: Completar la historia clínica (antecedentes patológicos, heredofamiliares,
medicamentos actuales, alergias) en el mismo formulario de alta de paciente (FR-001 a
FR-005, FR-009).

**Independent Test**: Dar de alta un paciente marcando antecedentes (incluido "Otros" con
descripción) y completando los 3 campos de texto libre, y verificar que la ficha creada
conserva toda esa información; dar de alta sin tocar la sección y verificar que igual se
puede guardar (Escenarios 1 y 2 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

> Escribir estos tests primero y confirmar que fallan antes de implementar.

- [X] T012 [P] [US1] Test unitario de validación Zod: valores válidos/inválidos de
  `antecedentesPatologicos` (enum de 21), y `antecedentesPatologicosOtros`/heredofamiliares/
  medicamentos/alergias con `trim()` (cadena vacía → `null`) en
  `tests/unit/historiaClinicaDto.test.ts`.
- [X] T013 [P] [US1] Test de integración de `POST /api/patients` con historia clínica en el
  body (201 con los 4 campos devueltos; 422 si `antecedentesPatologicos` contiene un valor
  fuera del enum) per `contracts/patients-api-historia-clinica.md` en
  `tests/integration/patients-historia-clinica.test.ts`.
- [X] T014 [P] [US1] Test e2e de los Escenarios 1-3 de `quickstart.md` (alta con historia
  clínica completa; alta sin completarla; "Otros" marcado y luego desmarcado antes de
  guardar) en `tests/e2e/historia-clinica-alta.spec.ts`.

### Implementation for User Story 1

- [X] T015 [US1] Agregar la sección "Historia clínica" a `PacienteFormulario.tsx`
  (`src/components/pacientes/PacienteFormulario.tsx`), inmediatamente después de
  "Información de contacto": grilla responsive de 21 `Checkbox` (§6.11) + casilla "Otros"
  que despliega un `Textarea` condicional + 3 `Textarea` (heredofamiliares, medicamentos
  actuales, alergias) — depende de T008, T009, T010, T011.
- [X] T016 [US1] Extender `ValoresPacienteFormulario` y `DatosEnviadosPacienteFormulario`
  (mismo archivo, `PacienteFormulario.tsx`) con los 4 campos nuevos y actualizar `onSubmit`:
  si la casilla "Otros" está desmarcada, o el texto queda vacío tras `trim()`, enviar `null`
  para `antecedentesPatologicosOtros` (FR-004, edge case del spec) — depende de T015.

**Checkpoint**: US1 funcional de punta a punta — un paciente nuevo puede crearse con o sin
historia clínica cargada.

---

## Phase 3: User Story 2 - Consultar la historia clínica en la ficha (Priority: P2)

**Goal**: Mostrar la historia clínica del paciente (antecedentes marcados, descripción de
"Otros", heredofamiliares, medicamentos, alergias) en su ficha, junto al resto de su
información (FR-011, FR-012).

**Independent Test**: Abrir la ficha de un paciente con historia clínica cargada y verificar
que se muestra correctamente; abrir la ficha de un paciente creado antes de esta feature y
verificar que la sección aparece vacía, sin error (Escenario 5 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T017 [P] [US2] Test e2e del Escenario 5 de `quickstart.md` (paciente creado antes de
  esta feature muestra la sección de historia clínica vacía, sin error) en
  `tests/e2e/historia-clinica-ficha-vacia.spec.ts`.

### Implementation for User Story 2

- [X] T018 [US2] Agregar la sección "Historia clínica" (modo lectura) a la ficha en
  `src/app/(shell)/pacientes/[id]/page.tsx`: antecedentes marcados con su etiqueta (usando
  el catálogo de T008), descripción de "Otros" si corresponde, heredofamiliares,
  medicamentos actuales y alergias — con un texto vacío explícito ("Sin historia clínica
  registrada") si no hay ningún dato cargado, mismo patrón que la sección "Información de
  contacto" — depende de T008, T011.

**Checkpoint**: US1 y US2 funcionan juntas de forma independiente.

---

## Phase 4: User Story 3 - Editar la historia clínica de un paciente existente (Priority: P3)

**Goal**: Actualizar la historia clínica de un paciente activo ya cargado, reemplazando por
completo los valores anteriores (FR-010, FR-013).

**Independent Test**: Editar la historia clínica de un paciente activo (agregar/quitar
antecedentes, cambiar texto) y verificar que los cambios se guardan; intentar editar la
historia clínica de un paciente archivado y verificar que exige reactivar primero
(Escenarios 4 y 6 de `quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T019 [P] [US3] Test unitario: `editarPaciente` reemplaza por completo los campos de
  historia clínica (no hay merge parcial con los valores anteriores) — agregar casos a
  `tests/unit/editarPaciente.test.ts`.
- [X] T020 [P] [US3] Test de integración: `PUT /api/patients/:id` con historia clínica (200
  con los nuevos valores; 409 `PACIENTE_ARCHIVADO` también bloquea cambios de historia
  clínica, no solo del resto de la ficha) — agregar casos a
  `tests/integration/patients-edit.test.ts`.
- [X] T021 [P] [US3] Test e2e de los Escenarios 4 y 6 de `quickstart.md` (editar historia
  clínica de un paciente activo; paciente archivado exige reactivar antes de editar) en
  `tests/e2e/historia-clinica-editar.spec.ts`.

### Implementation for User Story 3

- [X] T022 [US3] Precargar los 4 campos de historia clínica en `valoresIniciales` al entrar
  en modo edición, en `src/app/(shell)/pacientes/[id]/page.tsx` (depende de T016).

**Checkpoint**: US1, US2 y US3 funcionan juntas de forma independiente — spec
`003-historia-clinica-paciente` completo.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validación transversal (responsive, accesibilidad) que ninguna historia
individual cubre por sí sola, y verificación final de punta a punta.

- [X] T023 [P] Revisar la sección "Historia clínica" (checklist + textareas) en los tres
  breakpoints de `docs/design-system.md` §4.0 (celular/tablet/escritorio) — sin scroll
  horizontal, grilla del checklist colapsando 3→2→1 columnas.
- [X] T024 [P] Auditoría de accesibilidad de las 21 casillas y los 3 `Textarea` (labels
  asociados, foco visible, contraste ≥4.5:1, área táctil ≥44×44px) per §4.1.
- [X] T025 Ejecutar los 6 escenarios de `quickstart.md` de punta a punta como validación
  final, contra PostgreSQL real (migración de T004 aplicada).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Fase 1)**: sin dependencias externas a esta feature — depende solo del
  código ya existente de `001-gestion-pacientes`. Bloquea las 3 historias de usuario.
- **Historias de usuario (Fases 2-4)**: todas dependen de Foundational completo.
  - Pueden avanzar en paralelo si hay más de una persona trabajando, o secuencialmente en
    orden de prioridad P1 → P2 → P3 (recomendado para un solo desarrollador).
- **Polish (Fase 5)**: depende de que las historias que se quieran incluir estén completas.

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Sin dependencia de otras historias.
- **US2 (P2)**: solo depende de Foundational. Usa el catálogo de T008, ya creado ahí —
  independiente de la implementación de US1 (archivo distinto: ficha vs. formulario).
- **US3 (P3)**: depende de Foundational y de T016 (US1) — reutiliza los mismos
  `ValoresPacienteFormulario`/`onSubmit` del formulario compartido, no los reimplementa.

### Dentro de cada historia

- Tests primero (Principio I, NON-NEGOTIABLE) — deben fallar antes de implementar.
- Formulario/ficha (presentación) después de que el schema/entidad/repos de Foundational ya
  soporten los campos nuevos.
- Historia completa y verificada antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- T001, T002, T003, T006, T008, T009, T010 (Foundational) en paralelo entre sí (archivos
  distintos, sin dependencia mutua); T004 depende de T001, T005 depende de T004, T007
  depende de T001+T006, T011 depende de T009+T010.
- Los tests de cada historia (marcados [P]) en paralelo entre sí.
- US2 puede desarrollarse en paralelo con US1 una vez Foundational está listo (archivos
  independientes: ficha vs. formulario); US3 conviene secuenciarla después de US1 porque
  reutiliza su mismo componente de formulario.

---

## Parallel Example: Foundational

```bash
# Estas tareas tocan archivos distintos y no dependen entre sí:
Task: "Agregar enum y campos nuevos a la entidad Paciente en src/domain/entities/Paciente.ts"
Task: "Extender crearPacienteInputSchema en src/application/dto/pacienteDto.ts"
Task: "Crear catálogo de opciones en src/components/pacientes/antecedentesPatologicosOpciones.ts"
Task: "Crear componente Checkbox en src/components/ui/Checkbox.tsx"
Task: "Crear componente Textarea en src/components/ui/Textarea.tsx"
```

## Parallel Example: User Story 1 (tests)

```bash
Task: "Test unitario de validación Zod en tests/unit/historiaClinicaDto.test.ts"
Task: "Test de integración de POST /api/patients en tests/integration/patients-historia-clinica.test.ts"
Task: "Test e2e de los Escenarios 1-3 en tests/e2e/historia-clinica-alta.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Foundational (crítico — bloquea todo)
2. Completar Fase 2: User Story 1
3. **Parar y validar**: probar US1 de forma independiente (Escenarios 1-3 de
   `quickstart.md`)
4. Ya es un entregable real: el odontólogo puede cargar historia clínica al dar de alta.

### Incremental Delivery

1. Foundational → entidad, schema, repos y componentes de UI listos
2. + US1 (alta) → validar → MVP usable
3. + US2 (consulta en ficha) → validar → la historia clínica cargada se puede revisar
4. + US3 (edición) → validar → la historia clínica se mantiene al día
5. Polish → responsive, accesibilidad, validación final de punta a punta

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- [Story] mapea cada tarea a su historia de usuario para trazabilidad contra `spec.md`.
- Los tests son obligatorios por el Principio I de la constitución — no se omiten aunque el
  template base los marque como opcionales.
- Verificar que los tests fallan antes de implementar (Red-Green-Refactor).
- Cada historia debe quedar completa y validada antes de continuar con la siguiente,
  excepto si hay más de un desarrollador trabajando en paralelo.
