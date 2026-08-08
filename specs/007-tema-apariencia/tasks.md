---

description: "Task list for Tema de apariencia (Azul / Morado) (007-tema-apariencia)"
---

# Tasks: Tema de apariencia (Azul / Morado)

**Input**: Design documents from `/specs/007-tema-apariencia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige tests que fallen, escritos antes del código de implementación. Cada
fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota sobre alcance**: no hay `contracts/` (la feature no expone API ni interfaz externa,
ver plan.md). No se agrega ninguna dependencia nueva al proyecto — reutiliza `useState`/
`useEffect`, CSS custom properties nativas y los componentes `Card`/`Button` ya existentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto único Next.js (ver `plan.md` §Project Structure): `src/app/`, `src/hooks/`
(carpeta nueva), `docs/design-system.md`, `tests/unit/`, `tests/e2e/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: la escala de color morada, el mecanismo de theming por atributo en CSS, el
hook `useTema` y su aplicación global vía `TemaBootstrap`. Ninguna historia de usuario puede
demostrarse sin esto — incluso US1 por sí sola necesita que exista un tema morado real para
aplicar (FR-001, FR-006).

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T001 Agregar los primitivos `--color-purple-50/600/700/800/900` (valores y roles de
  `research.md` §1) a `docs/design-system.md` §2.1, y documentar el mecanismo de theming por
  atributo `data-theme` como nueva subsección bajo §3.2 — Principio VI: todo token/patrón
  nuevo se define ahí primero, antes de tocar `globals.css`.
- [X] T002 [P] Agregar los primitivos `--color-purple-*` y el bloque
  `[data-theme="morado"]` (reasignando `--color-primary`, `--color-primary-hover`,
  `--color-primary-active`, `--color-primary-accent`, `--color-ring` — FR-006) a
  `src/app/globals.css` (depende de T001).
- [X] T003 [P] Crear el hook `useTema` en `src/hooks/useTema.ts`: expone `{ tema, setTema }`;
  estado inicial `"azul"`; en un `useEffect` post-mount lee `localStorage["tema"]` (mismo
  patrón que `sidebar-colapsada` en `src/app/(shell)/layout.tsx`); `setTema` actualiza el
  estado y escribe en `localStorage` en el mismo tick — per `data-model.md`.
- [X] T004 Crear el componente `TemaBootstrap` (sin salida visual, `return null`) que usa
  `useTema()` y aplica `document.documentElement.dataset.theme = tema` en un efecto; montarlo
  junto a `SyncEngineBootstrap` en `src/app/providers.tsx` (depende de T003) — per
  `research.md` §2.

**Checkpoint**: el tema se puede aplicar globalmente y persiste vía el hook — falta la UI
para que el usuario lo controle.

---

## Phase 2: User Story 1 - Elegir el tema morado (Priority: P1) 🎯 MVP

**Goal**: dos swatches clicables en Configuración que cambian el tema de toda la app al
instante, sin afectar los colores de estado (FR-001, FR-002, FR-006).

**Independent Test**: entrar a `/configuracion`, hacer clic en el swatch morado y verificar
que los elementos primarios cambian de inmediato en toda la interfaz, sin recargar, mientras
las alertas de éxito/error mantienen sus colores (Escenarios 1 y 2 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

- [X] T005 [P] [US1] Test unitario del hook `useTema`: expone `{ tema, setTema }`; estado
  inicial `"azul"`; `setTema("morado")` actualiza el estado y escribe `localStorage["tema"]`
  — con `@testing-library/react` (`renderHook`) en `tests/unit/useTema.test.ts`, per
  `data-model.md`.
- [X] T006 [P] [US1] Test e2e de los Escenarios 1 y 2 de `quickstart.md` (clic en el swatch
  morado aplica al instante sin recargar; navegar a otra pantalla mantiene el tema; una
  alerta de error/éxito conserva sus colores de estado sin importar el tema activo) en
  `tests/e2e/tema-apariencia.spec.ts`.

### Implementation for User Story 1

- [X] T007 [US1] Agregar la sección `<Card>` "Apariencia" con los swatches "Azul"/"Morado"
  entre "Tus datos" y "Cambiar contraseña" en `src/app/(shell)/configuracion/page.tsx`: usa
  `useTema()` para leer el tema actual y llama `setTema` al hacer clic en cada swatch
  (depende de T003, T004).

**Checkpoint**: US1 funcional de punta a punta — el usuario ya puede cambiar de tema y ver
el efecto al instante en toda la app.

---

## Phase 3: User Story 2 - La preferencia de tema persiste entre sesiones (Priority: P2)

**Goal**: el tema elegido se recuerda por navegador entre recargas y visitas, sin viajar
entre dispositivos, y sin romper la app si `localStorage` no está disponible (FR-003, FR-004,
FR-005, FR-008).

**Independent Test**: elegir morado, recargar la página y confirmar que sigue activo; abrir
la app en un navegador/contexto distinto y confirmar que se ve azul por defecto (Escenario 3
de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T008 [P] [US2] Test unitario adicional en `tests/unit/useTema.test.ts`: valor guardado
  que no es `"azul"` ni `"morado"` (corrupto) se trata como ausente; `localStorage`
  inaccesible/bloqueado no lanza error y el hook sigue devolviendo `"azul"` (FR-008, Edge
  Cases de `spec.md`) — per `data-model.md`.
- [X] T009 [P] [US2] Test e2e del Escenario 3 de `quickstart.md`: elegir morado, recargar la
  página y confirmar que sigue activo; abrir un contexto de navegador nuevo (incógnito) y
  confirmar que ve azul por defecto — en `tests/e2e/tema-apariencia.spec.ts` (mismo archivo
  que T006, casos adicionales).

### Implementation for User Story 2

- [X] T010 [US2] Endurecer `useTema` (`src/hooks/useTema.ts`) para que la lectura/escritura
  de `localStorage` esté envuelta en manejo de errores y cualquier valor guardado que no sea
  exactamente `"azul"` o `"morado"` se trate como ausente, sin lanzar (FR-008) — depende de
  T003, valida contra T008.

**Checkpoint**: US1 y US2 funcionan juntas — el tema se aplica al instante y se recuerda por
navegador.

---

## Phase 4: User Story 3 - Ver claramente cuál tema está activo (Priority: P3)

**Goal**: el swatch correspondiente al tema activo se distingue visualmente del otro en todo
momento (FR-007).

**Independent Test**: abrir la sección "Apariencia" y verificar que el swatch activo se ve
marcado como seleccionado; al cambiar de tema, la marca se mueve de inmediato al otro swatch
(Escenario 4 de `quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T011 [P] [US3] Test e2e del Escenario 4 de `quickstart.md` (el swatch activo se
  distingue visualmente; al cambiar de tema, la marca de seleccionado se mueve al instante)
  en `tests/e2e/tema-apariencia.spec.ts`.

### Implementation for User Story 3

- [X] T012 [US3] Agregar el indicador visual de selección (borde/marca + `aria-pressed`) a
  los swatches de "Apariencia" en `src/app/(shell)/configuracion/page.tsx`, reflejando el
  tema activo devuelto por `useTema()` (depende de T007).

**Checkpoint**: las 3 historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: verificación final transversal, incluida la degradación sin `localStorage` y la
consistencia visual documentada en `research.md`.

- [X] T013 [P] Test unitario/e2e del Escenario 5 de `quickstart.md` (con `localStorage`
  bloqueado, el tema se aplica igual para la sesión actual sin errores visibles, aunque no
  persista) — integrarlo en `tests/unit/useTema.test.ts` si no quedó cubierto por T008.
- [X] T014 [P] Verificar el contraste de `--color-purple-700` sobre
  `--color-primary-foreground` (blanco) contra el cálculo de `research.md` §1, y el
  contraste visual de los swatches nuevos contra `--color-background` (Principio VI).
- [X] T015 [P] Verificar la sección "Apariencia" (`Card` + swatches) en los tres breakpoints
  de `docs/design-system.md` §4.0 — Principio VI, responsive NON-NEGOTIABLE.
- [X] T016 `tsc --noEmit` y `eslint` limpios en todos los archivos nuevos/modificados de este
  feature.
- [X] T017 [P] Revisar visualmente el ítem activo de la Sidebar con el tema morado activo
  (`research.md` §3): confirmar que la combinación fondo cyan claro + texto morado sigue
  siendo legible, tal como se decidió aceptar sin agregar un token nuevo.
- [X] T018 [P] Correr los 5 escenarios de `quickstart.md` de punta a punta manualmente.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias externas — BLOQUEA todas las historias de
  usuario.
- **Historias de usuario (Phase 2+)**: todas dependen de Foundational.
  - US1 no depende de US2 ni US3: con el hook y el theming de Foundational, alcanza para
    demostrar el cambio instantáneo de tema.
  - US2 depende de que el hook exista (Foundational) pero endurece un comportamiento
    (T010) que no bloquea a US1 — puede avanzar en paralelo a US1 una vez completado
    Foundational.
  - US3 depende de que exista la UI de swatches de US1 (T007) para agregarle el indicador
    visual — es la única historia con una dependencia real sobre otra historia.
- **Polish (Phase 5)**: depende de que las 3 historias estén completas.

### Dentro de cada historia

- Tests (obligatorios) se escriben y deben fallar antes de implementar.
- Foundational (hook + theming CSS) antes que la UI que lo consume.
- US1 (swatches base) antes que US3 (indicador de selección sobre esos mismos swatches).

### Oportunidades de paralelismo

- T001, T002 y T003 (Foundational) pueden avanzar en paralelo entre sí — T002 depende del
  contenido de T001 pero son archivos distintos y el valor a copiar ya está fijado en
  `research.md`, así que en la práctica no hay bloqueo real de escritura.
- Los 2 tests de US1 (T005-T006) en paralelo.
- Los 2 tests de US2 (T008-T009) en paralelo, y en paralelo con los de US1.
- T010 (US2) puede avanzar en paralelo a T007 (US1) una vez completado Foundational, ya que
  tocan responsabilidades distintas del mismo archivo de hook vs. la página de Configuración
  — solo la prueba e2e completa de ambas historias comparte archivo (`tema-apariencia.spec.ts`)
  y debe coordinarse para no pisarse.

---

## Parallel Example: Foundational

```bash
# Al inicio de Foundational, lanzar juntas:
Task: "Crear el hook useTema en src/hooks/useTema.ts (T003)"
Task: "Agregar los primitivos --color-purple-* a docs/design-system.md (T001)"
```

## Parallel Example: User Story 1

```bash
# Los 2 tests de US1 no comparten archivo — lanzar juntos:
Task: "Test unitario del hook useTema (T005)"
Task: "Test e2e de los Escenarios 1 y 2 de quickstart.md (T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Foundational (crítico — bloquea todo)
2. Completar Phase 2: User Story 1
3. **Detener y validar**: probar US1 de forma independiente (Escenarios 1 y 2 de
   `quickstart.md`)
4. El usuario ya puede cambiar entre azul y morado, aunque todavía no se recuerde entre
   sesiones ni tenga indicador visual de selección

### Entrega incremental

1. Foundational → hook y theming listos
2. US1 → validar → demo (MVP: cambio de tema instantáneo)
3. US2 → validar → demo (persistencia por navegador)
4. US3 → validar → demo (indicador visual de selección)
5. Polish → validación de punta a punta, incluida la degradación sin `localStorage`

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- Verificar que los tests fallan antes de implementar.
- Commit después de cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
- Evitar: tareas vagas, conflictos de archivo entre historias, dependencias cruzadas que
  rompan la independencia de cada historia.
