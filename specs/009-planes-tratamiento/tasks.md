---

description: "Task list template for feature implementation"
---

# Tasks: Planes de tratamiento

**Input**: Design documents from `/specs/009-planes-tratamiento/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Incluidos — Principio I de la constitución (Test-First) es no negociable; Vitest
para los 2 casos de uso nuevos, Playwright para las 4 historias de usuario del spec.

**Organization**: Tareas agrupadas por historia de usuario, para poder implementar y
verificar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3, US4)

## Path Conventions

Proyecto único Next.js — `src/`, `tests/`, `prisma/` en la raíz del repo (ver plan.md
§Project Structure).

---

## Phase 1: Setup

**Purpose**: No hay dependencias nuevas que instalar (plan.md §Technical Context) — solo
preparar la carpeta de componentes de esta feature.

- [x] T001 Crear la carpeta `src/components/planes/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extender `ItemPlanTratamiento` en sus 3 capas y habilitar la pestaña — sin esto
ninguna historia de usuario puede mostrar ni editar `fechaRealizado`/`nota`.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [x] T002 Agregar `fechaRealizado: string | null` y `nota: string | null` a la interfaz
      `ItemPlanTratamiento`, valores por defecto `null` en
      `crearItemPlanTratamientoDesdeDatos`, y ambos campos opcionales en
      `DatosEdicionItemPlanTratamiento`, en `src/domain/entities/ItemPlanTratamiento.ts`
      (data-model.md §`ItemPlanTratamiento`, §`DatosEdicionItemPlanTratamiento`)
- [x] T003 Agregar `fechaRealizado DateTime? @db.Date` y `nota String?` al modelo
      `ItemPlanTratamiento` en `prisma/schema.prisma`, y correr `npx prisma migrate dev` para
      generar la migración (data-model.md §Migración de datos) — depende de T002
- [x] T004 [P] Extender `editarItemPlanTratamientoInputSchema` con `fechaRealizado` y `nota`
      opcionales (`z.string().nullable().optional()`) en
      `src/application/dto/odontogramaDto.ts` (data-model.md §Zod) — depende de T002
- [x] T005 [P] Extender `ItemPlanTratamientoRepositoryDexie.editar()` con una rama
      condicional más por campo nuevo (mismo patrón ya usado para `diente`) en
      `src/infrastructure/db/dexie/ItemPlanTratamientoRepositoryDexie.ts` — depende de T002
- [x] T006 [P] Extender `ItemPlanTratamientoRepositoryPrisma.editar()` (mismo patrón
      condicional) y `aDominioItemPlanTratamiento()` (mapear las 2 columnas nuevas) en
      `src/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma.ts` — depende de T003
- [x] T007 Quitar `deshabilitada: true` de la entrada "planes" en el array de tabs de
      `src/app/(shell)/pacientes/[id]/page.tsx`, dejando el `case`/render de ese tab listo
      para montar `PlanesTab` (aún sin crear — placeholder temporal de una línea)

**Checkpoint**: `ItemPlanTratamiento` tiene los 2 campos nuevos en las 3 capas, y la pestaña
"Planes" es clickeable. Recién ahora pueden empezar las historias de usuario.

---

## Phase 3: User Story 1 - Consultar el registro consolidado (Priority: P1) 🎯 MVP

**Goal**: Ver, en la pestaña Planes, todas las líneas de plan de tratamiento ya guardadas
desde Odontograma, con sus 5 columnas.

**Independent Test**: Cargar y guardar una línea desde Odontograma, abrir Planes, verificar
que aparece con los mismos datos; verificar que una línea sin guardar (borrador) no aparece.

### Tests for User Story 1

- [x] T008 [P] [US1] Playwright — Escenario 1 de quickstart.md (registro consolidado, borrador
      no aparece hasta "Guardar cambios", mensaje de vacío) en
      `tests/e2e/planes-listado.spec.ts`

### Implementation for User Story 1

- [x] T009 [P] [US1] Crear `TablaPlanes.tsx` — componente presentacional, recibe `items:
      ItemPlanTratamiento[]` y `mensajeVacio: string`; columnas Fecha de creación, Diente,
      Tratamiento, Fecha en que se realizó (texto — "—" si `null`, todavía no editable) y
      Nota (texto — todavía no editable) — en `src/components/planes/TablaPlanes.tsx`
- [x] T010 [P] [US1] Crear `PlanesTab.module.css` en
      `src/components/planes/PlanesTab.module.css` (mismo patrón de tabla con scroll
      horizontal en mobile que `PlanTratamientoTabla.module.css`)
- [x] T011 [US1] Crear `PlanesTab.tsx` — `useLiveQuery` sobre
      `listarPorPaciente(pacienteId)` (mismo repo ya existente), título "Todos los planes",
      mensaje explícito si no hay ninguna línea, renderiza `TablaPlanes` — en
      `src/components/planes/PlanesTab.tsx` — depende de T009, T010
- [x] T012 [US1] Montar `PlanesTab` (con `pacienteId`, `soloLectura`) en el tab "planes" de
      `src/app/(shell)/pacientes/[id]/page.tsx`, reemplazando el placeholder de T007 —
      depende de T011

**Checkpoint**: La pestaña Planes ya es útil por sí sola — muestra el registro completo de
planes guardados, de solo lectura.

---

## Phase 4: User Story 2 - Marcar un plan como realizado (Priority: P1)

**Goal**: Tildar/destildar el checkbox "Realizado" de una línea y ver la fecha de
realización completarse/vaciarse de inmediato, sin botón de guardado aparte.

**Independent Test**: Tildar el checkbox de una línea, verificar que la fecha de hoy aparece
de inmediato y persiste al recargar; destildarlo y verificar que la fecha se limpia.

### Tests for User Story 2

- [x] T013 [P] [US2] Vitest para `marcarRealizadoItemPlanTratamiento` (tildar completa
      `fechaRealizado` con la fecha del día; destildar la vacía; nunca acepta una fecha como
      parámetro) en `tests/unit/marcarRealizadoItemPlanTratamiento.test.ts`
- [x] T014 [P] [US2] Playwright — Escenario 2 de quickstart.md (tildar, recargar, destildar)
      en `tests/e2e/planes-marcar-realizado.spec.ts`

### Implementation for User Story 2

- [x] T015 [US2] Crear el caso de uso `marcarRealizadoItemPlanTratamiento(repo, id,
      realizado, baseVersion)` (data-model.md §Casos de uso nuevos) en
      `src/application/use-cases/marcarRealizadoItemPlanTratamiento.ts` — depende de T005,
      T006
- [x] T016 [US2] Reemplazar la columna "Fecha en que se realizó" de `TablaPlanes.tsx` por un
      checkbox interactivo "Realizado" (tildado si `fechaRealizado !== null`) que muestra la
      fecha al lado cuando está tildado; deshabilitado si `soloLectura` — depende de T009
- [x] T017 [US2] Conectar el checkbox en `PlanesTab.tsx`: `onChange` llama a
      `marcarRealizadoItemPlanTratamiento` con el `id`/`version` de la línea — depende de
      T015, T016

**Checkpoint**: Se puede marcar y desmarcar el avance de cada plan, con guardado inmediato.

---

## Phase 5: User Story 3 - Consultar solo los planes realizados (Priority: P2)

**Goal**: Ver, dentro de la misma pestaña Planes, una segunda vista con únicamente los
planes ya marcados como realizados.

**Independent Test**: Marcar una línea como realizada y dejar otra pendiente; verificar que
"Planes Realizados" lista solo la primera, y que desmarcarla la saca de esa vista de
inmediato.

### Tests for User Story 3

- [x] T018 [P] [US3] Playwright — Escenario 3 de quickstart.md (filtrado, desmarcar la saca
      de la vista, eliminar desde Odontograma la saca de ambas vistas) en
      `tests/e2e/planes-realizados.spec.ts`

### Implementation for User Story 3

- [x] T019 [US3] En `PlanesTab.tsx`, derivar `planesRealizados` con un `.filter(item =>
      item.fechaRealizado !== null)` sobre el mismo array ya traído por `listarPorPaciente`
      (research.md #2 — sin segunda consulta), y renderizar una segunda sección "Planes
      Realizados" con su propia `TablaPlanes` — depende de T011, T017
- [x] T020 [P] [US3] Agregar a `TablaPlanes.tsx` el mensaje explícito de vacío cuando
      `items.length === 0`, reutilizable para ambas vistas vía la prop `mensajeVacio` ya
      definida en T009 (verificar que cubre "no hay planes realizados todavía")

**Checkpoint**: Ambas vistas conviven en la pestaña Planes, siempre sincronizadas porque
comparten la misma fuente de datos.

---

## Phase 6: User Story 4 - Agregar una aclaración a un plan (Priority: P3)

**Goal**: Escribir/editar una nota libre por línea desde la pestaña Planes, guardada al
perder el foco del campo.

**Independent Test**: Escribir una nota, sacar el foco, recargar y verificar que persiste;
editarla y verificar que el nuevo texto reemplaza al anterior.

### Tests for User Story 4

- [x] T021 [P] [US4] Vitest para `editarNotaItemPlanTratamiento` (normaliza texto vacío a
      `null`, no toca ningún otro campo) en
      `tests/unit/editarNotaItemPlanTratamiento.test.ts`
- [x] T022 [P] [US4] Playwright — Escenario 4 de quickstart.md (cargar nota, recargar,
      editarla) en `tests/e2e/planes-nota.spec.ts`

### Implementation for User Story 4

- [x] T023 [US4] Crear el caso de uso `editarNotaItemPlanTratamiento(repo, id, nota,
      baseVersion)` (data-model.md §Casos de uso nuevos) en
      `src/application/use-cases/editarNotaItemPlanTratamiento.ts` — depende de T005, T006
- [x] T024 [US4] Reemplazar la columna "Nota" de `TablaPlanes.tsx` por un campo de texto
      editable (valor inicial = la nota actual, guarda `onBlur` solo si cambió — mismo
      patrón que `NotaTextarea` de Odontograma); deshabilitado si `soloLectura` — depende de
      T009
- [x] T025 [US4] Conectar el campo de nota en `PlanesTab.tsx`: `onBlur` llama a
      `editarNotaItemPlanTratamiento` con el `id`/`version` de la línea — depende de T023,
      T024

**Checkpoint**: Las 4 historias de usuario funcionan juntas — registro, marcado,
vista filtrada y notas.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificar los límites de edición y el modo solo lectura, que atraviesan varias
historias.

- [x] T026 [P] Playwright — verificar que desde Planes no hay ningún control para editar
      fecha de creación/diente/tratamiento ni para eliminar una línea (FR-010), y que el tab
      Odontograma sigue funcionando exactamente igual que antes de esta feature (FR-011) en
      `tests/e2e/planes-limites.spec.ts`
- [x] T027 [P] Playwright — paciente archivado: el checkbox y la nota se ven pero no son
      editables en la pestaña Planes (FR-012) en `tests/e2e/planes-archivado.spec.ts`
- [x] T028 Correr `npx tsc --noEmit`, `npx eslint .` y `npx vitest run` — confirmar todo en
      verde antes de dar la feature por terminada
- [ ] T029 Ejecutar manualmente los 4 escenarios + verificaciones de `quickstart.md` de
      punta a punta

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA las 4 historias de usuario.
- **US1 (Phase 3)**: depende de Foundational. No depende de otra historia — es el MVP.
- **US2 (Phase 4)**: depende de Foundational y de que `TablaPlanes.tsx` exista (T009, de
  US1) porque reemplaza una de sus columnas — no puede empezar en paralelo con US1, sí puede
  avanzar en paralelo con US3/US4 una vez T009 está listo.
- **US3 (Phase 5)**: depende de Foundational y de que "Todos los planes" ya funcione (T011,
  T017 — filtra sobre datos que ya incluyen `fechaRealizado` real, no el texto estático de
  T009).
- **US4 (Phase 6)**: depende de Foundational y de T009 (mismo motivo que US2) — independiente
  de US2/US3 entre sí.
- **Polish (Phase 7)**: depende de las 4 historias completas.

### Parallel Opportunities

- T004, T005, T006 (Foundational) en paralelo una vez T002/T003 están listos.
- T008 (test US1) en paralelo con T009/T010.
- T013+T014 (tests US2) en paralelo entre sí; T021+T022 (tests US4) en paralelo entre sí.
- Una vez completado el Checkpoint de US1 (T012), **US2 y US4 pueden avanzar en paralelo**
  entre sí (tocan columnas distintas de `TablaPlanes.tsx` y casos de uso distintos) — US3
  conviene hacerlo después de US2, porque el filtrado tiene más sentido de validar con el
  checkbox ya funcionando de verdad.

---

## Parallel Example: Foundational

```bash
# Una vez T002 y T003 (entidad + migración) están listos:
Task: "Extender editarItemPlanTratamientoInputSchema en src/application/dto/odontogramaDto.ts"
Task: "Extender ItemPlanTratamientoRepositoryDexie.editar() en src/infrastructure/db/dexie/ItemPlanTratamientoRepositoryDexie.ts"
Task: "Extender ItemPlanTratamientoRepositoryPrisma.editar() en src/infrastructure/db/prisma/ItemPlanTratamientoRepositoryPrisma.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Playwright Escenario 1 en tests/e2e/planes-listado.spec.ts"
Task: "Crear TablaPlanes.tsx en src/components/planes/TablaPlanes.tsx"
Task: "Crear PlanesTab.module.css en src/components/planes/PlanesTab.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1 (Setup) y Fase 2 (Foundational — bloqueante).
2. Completar Fase 3 (US1) → pestaña Planes funcional, de solo lectura.
3. **Parar y validar**: correr el Escenario 1 de `quickstart.md` de punta a punta.
4. Ya es demostrable/desplegable como MVP — el resto de las historias son incrementos.

### Entrega incremental

1. Setup + Foundational → base lista.
2. US1 → registro consolidado visible → demo (MVP).
3. US2 → marcar como realizado → demo.
4. US3 → vista filtrada → demo.
5. US4 → notas → demo.
6. Polish → límites de edición + archivado verificados de punta a punta.

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí.
- Cada caso de uso nuevo (T015, T023) tiene su test Vitest escrito antes (T013, T021) —
  Principio I de la constitución, no negociable.
- `TablaPlanes.tsx` es el único archivo que tocan tanto US2 como US4 (columnas distintas) —
  si se paralelizan, coordinar para no pisarse en el mismo archivo.
- Ningún task de este documento modifica `PlanTratamientoTabla.tsx` ni el tab Odontograma —
  el origen queda intacto por diseño (FR-011).
- **T029 pendiente**: los Playwright de T008/T014/T018/T022/T026/T027 están escritos pero no
  se corrieron (necesitan servidor + base real levantados) — typecheck, lint y los 225 tests
  de Vitest sí se corrieron y están en verde. Correr `npx playwright test` para cerrar T029.
- `npx prisma generate` no pudo reescribir el binario nativo del motor de consultas
  (`query_engine-windows.dll.node`) por un bloqueo de archivo — probablemente OneDrive
  sincronizando `node_modules` en tiempo real. La migración a la base **sí se aplicó**
  (`npx prisma migrate dev` la corrió sin problema) y los tipos TypeScript del cliente **sí
  se regeneraron** (verificado en `node_modules/.prisma/client/index.d.ts`) — typecheck en
  verde lo confirma. Recomendado: excluir `node_modules` de la sincronización de OneDrive
  para que esto no vuelva a pasar.
