---

description: "Task list for 008-rediseno-visual-sistema"

---

# Tasks: Rediseño visual del sistema (estilo mockup DentalPro)

**Input**: Design documents from `/specs/008-rediseno-visual-sistema/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Se incluye una prueba e2e nueva para US1 (la más propensa a regresión silenciosa —
un layout que "se ve bien" en un estado de sidebar puede romperse en el otro sin que un
`tsc`/`eslint` lo detecte). No se agregan tests unitarios nuevos: no hay lógica de dominio
nueva, solo estado de presentación y CSS.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: A qué user story de spec.md pertenece la tarea

## Phase 1: Setup

No aplica — no hay estructura de proyecto nueva que inicializar, se reutiliza la app Next.js
ya existente.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estado compartido del que dependen US1 y US2 (ambas tocan `TopAppBar`, que
necesita conocer el colapso de la sidebar)

**⚠️ CRITICAL**: Ninguna tarea de US1/US2 sobre `TopAppBar` puede empezar hasta que exista el
contexto

- [x] T001 Crear `src/components/ui/SidebarContext.tsx`: `React.createContext<boolean>`
  (default `false`) + `SidebarProvider` (recibe `colapsada` como prop) + hook
  `useSidebarColapsada()` que lee el contexto
- [x] T002 Modificar `src/app/(shell)/layout.tsx` (`ShellLayout`): envolver el `return` en
  `<SidebarProvider colapsada={colapsada}>`, sin cambiar la lógica existente de cálculo de
  `colapsada` (localStorage + colapso por ruta)

**Checkpoint**: `useSidebarColapsada()` disponible para cualquier componente dentro del shell

---

## Phase 3: User Story 1 - El listado de Pacientes se ve y se comporta correctamente (Priority: P1) 🎯 MVP

**Goal**: Eliminar el espacio en blanco y la desincronización entre sidebar, `TopAppBar` y
contenido principal

**Independent Test**: Abrir `/pacientes`, alternar el colapso de la sidebar varias veces,
confirmar que no aparece espacio en blanco entre la sidebar y el contenido en ningún estado

### Tests for User Story 1

- [x] T003 [P] [US1] Nueva prueba e2e en
  `tests/e2e/layout-sidebar-topappbar.spec.ts`: navega a `/pacientes`, lee
  `getBoundingClientRect().left` del `TopAppBar` y del contenedor principal en estado
  expandido, colapsa la sidebar, vuelve a leer ambos, y verifica que (a) ambos coinciden entre
  sí en cada estado y (b) el valor cambia de 256 a 64 (o el breakpoint correspondiente) al
  colapsar — debe fallar contra el código actual (bug de doble `margin-left` + `TopAppBar`
  desincronizado) antes de la implementación

### Implementation for User Story 1

- [x] T004 [US1] Quitar `margin-left: 256px` de `.main` en
  `src/app/(shell)/pacientes/pacientes.module.css` — ese offset ya lo resuelve `.content` de
  `ShellLayout`; conservar solo `margin-top: 64px` (espacio para el `TopAppBar` fijo) y los
  ajustes de `margin-left` dentro de los media queries de tablet/celular si corresponde
  (revisar que no dupliquen ahí tampoco)
- [x] T005 [US1] Modificar `src/components/ui/TopAppBar.module.css`: agregar clase
  `.colapsada` con `margin-left: 64px` (en vez de los 256px del selector base), con la misma
  `transition: margin-left 200ms ease-in-out` que ya usa `.content`/`Sidebar`, y respetando
  `@media (prefers-reduced-motion: reduce)` igual que el resto del layout
- [x] T006 [US1] Modificar `src/components/ui/TopAppBar.tsx`: usar `useSidebarColapsada()`
  (de T001) para aplicar condicionalmente la clase `.colapsada` al `<header>`
- [x] T007 [US1] Verificar manualmente en `/pacientes` los breakpoints de tablet (<1024px) y
  celular (<640px) — confirmar que `TopAppBar` y el contenido siguen alineados con el ancho de
  sidebar real de cada breakpoint (64px en tablet; sin sidebar lateral en celular, `TopAppBar`
  debe volver a `margin-left: 0` en ese rango)
- [x] T008 [US1] Correr `npx playwright test tests/e2e/layout-sidebar-topappbar.spec.ts` y
  confirmar que pasa en verde

**Checkpoint**: US1 completa — layout sincronizado en todos los breakpoints, prueba e2e en
verde

---

## Phase 4: User Story 2 - Los íconos y botones de la barra superior se ven correctamente (Priority: P1)

**Goal**: Ícono de configuración limpio (un solo engranaje) y botón "+Nuevo paciente" sin
subrayado heredado

**Independent Test**: Abrir `/pacientes` e inspeccionar visualmente el ícono de configuración
y el botón "+Nuevo paciente"

### Implementation for User Story 2

- [x] T009 [P] [US2] En `src/components/ui/TopAppBar.tsx`, función `IconoSettings`: eliminar
  el `<circle>` y los dos `<path>` de líneas radiales (el ícono "sol" remanente de un intento
  anterior), dejando únicamente el `<path>` del engranaje real
- [x] T010 [P] [US2] En `src/components/ui/TopAppBar.module.css`, agregar una clase
  `.linkReset` (o equivalente) con `text-decoration: none; color: inherit; display: inline-flex`
  aplicada directamente sobre el `<Link>` que envuelve `.primaryButton` en `TopAppBar.tsx` —
  resetear `text-decoration` únicamente en `.primaryButton` no alcanza porque la línea de
  subrayado la dibuja el `<a>` ancestro y se propaga a través de sus descendientes salvo que el
  propio `<a>` (o un hijo directo) la resetee explícitamente
- [x] T011 [US2] En `src/components/ui/TopAppBar.tsx`, aplicar la clase de T010 al `<Link>`
  que envuelve el botón "+Nuevo paciente"
- [x] T012 [US2] Verificación visual manual: confirmar en `/pacientes` que el ícono de
  configuración es un engranaje limpio y que "+Nuevo paciente" no muestra subrayado ni color de
  enlace visitado, incluyendo estado `:hover` y `:focus-visible`

**Checkpoint**: US1 y US2 completas — `/pacientes` visualmente correcta y funcionalmente
idéntica a antes de esta ronda

---

## Phase 5: User Story 3 - El nuevo estilo visual queda documentado (Priority: P2)

**Goal**: `docs/design-system.md` describe el nuevo estilo visual y qué pantallas lo usan

**Independent Test**: Abrir `docs/design-system.md` y confirmar que describe paleta,
tipografía, sombras, y los patrones de `TopAppBar`/tarjeta de métrica/switch-tabs/tabla
moderna, con una tabla de pantallas migradas vs. pendientes

### Implementation for User Story 3

- [x] T013 [US3] Agregar nueva sección `### 6.20 TopAppBar` en `docs/design-system.md`
  (después de §6.19), documentando: estructura (buscador + ícono de configuración + acción
  primaria), el patrón de sincronización con el colapso de la sidebar vía
  `SidebarContext`/`useSidebarColapsada()` (T001, referenciando que ningún elemento
  `position:fixed` debe inventar su propio cálculo de offset), y el efecto glassmorphism
  (`backdrop-filter: blur(12px)` + fondo semitransparente)
- [x] T014 [P] [US3] Agregar nueva sección `### 6.21 Tarjeta de métrica (bento)` documentando
  el patrón usado en las 3 tarjetas de `/pacientes` (Total Pacientes/Citas Hoy/Nuevos del Mes):
  ícono con fondo tintado, valor grande, hover con elevación
- [x] T015 [P] [US3] Agregar nueva sección `### 6.22 Switch-tabs animado` documentando el
  patrón usado por el toggle Activos/Archivados de `/pacientes` (pastilla activa con fondo
  blanco + sombra sobre fondo gris, en vez del patrón anterior de `Tabs` con subrayado) y
  aclarar cuándo usar este patrón vs. el `Tabs` de §6.10 ya existente (switch-tabs para
  alternar entre 2 vistas de una misma lista; `Tabs` para navegación entre secciones)
- [x] T016 [US3] Actualizar `### 6.5 Table` con el patrón de tabla moderna ya aplicado en
  `/pacientes` (headers uppercase con tracking, hover de fila con tinte `--color-primary`,
  bordes sutiles en vez de `--color-border` sólido) — reemplaza/extiende la descripción
  existente, no crea una sección nueva
- [x] T017 [US3] Actualizar §2.1 (Tokens primitivos) y §3 (Tokens semánticos) de
  `docs/design-system.md` para reflejar los valores hex reales ya aplicados en
  `src/app/globals.css` (paleta cyan-700 `#00647c` como primary, radios de borde ampliados,
  sombras "soft-saas", tipografía Inter) — estos tokens ya están en el código pero el
  documento todavía describe los valores anteriores más simples
- [x] T018 [US3] Agregar tabla explícita en la sección correspondiente (§6.20 o una subsección
  nueva) listando qué pantallas ya usan el estilo nuevo (`/pacientes`) y cuáles siguen con el
  estilo anterior (Inicio, Insumos, ficha de paciente, Odontograma, Citas, Configuración),
  marcadas como pendientes de migración en specs futuras
- [x] T019 [US3] Bump de versión de `docs/design-system.md` (línea 3, `**Status**`, y el pie
  de página `**Versión**`) siguiendo semver del propio documento, + nueva entrada en
  `## Historial` describiendo esta ronda (bugs corregidos + nuevo estilo documentado),
  siguiendo el formato ya usado por las entradas anteriores (ver v1.24.0 como referencia de
  formato)

**Checkpoint**: Las 3 user stories completas — layout corregido, íconos/botón corregidos,
estilo documentado

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 `npx tsc --noEmit` sin errores
- [x] T021 `npx eslint .` sin warnings nuevos
- [x] T022 `npx vitest run` — suite unitaria completa en verde (sin regresiones)
- [x] T023 `npx playwright test tests/e2e/pacientes*.spec.ts` — confirma SC-004 (listado de
  Pacientes funcionalmente idéntico a antes de esta ronda)
- [x] T024 Ejecutar la validación manual completa de `quickstart.md` (pasos 1–7) y confirmar
  cada ítem "Esperado"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: bloquea Phase 3 y Phase 4 (ambas dependen de
  `useSidebarColapsada()`)
- **US1 (Phase 3)** y **US2 (Phase 4)**: ambas P1, pueden implementarse en cualquier orden
  entre sí tras Phase 2, pero ambas tocan `TopAppBar.tsx`/`.module.css` — no son paralelas
  entre sí en la práctica (mismo archivo)
- **US3 (Phase 5)**: puede empezar en paralelo con Phase 3/4 (toca solo
  `docs/design-system.md`, sin dependencia de código), pero su contenido final (T013, T018)
  describe el resultado de US1/US2 — conviene cerrarla al final para documentar el estado real
- **Polish (Phase 6)**: depende de que Phase 3, 4 y 5 estén completas

### Parallel Opportunities

- T009 y T010 (US2) son [P] — archivos/ediciones independientes dentro de los mismos dos
  archivos pero en secciones distintas (ícono vs. clase CSS nueva), pueden prepararse en
  paralelo antes de integrarlas en T011
- T014 y T015 (US3) son [P] — secciones nuevas independientes de `docs/design-system.md`
- Phase 5 (US3) completa puede avanzar en paralelo con Phase 3/4, salvo T013 y T018 que
  conviene dejar para el final

---

## Implementation Strategy

### MVP First

1. Completar Phase 2 (Foundational) — desbloquea todo lo demás
2. Completar Phase 3 (US1) — el bug más visible y repetido queda resuelto
3. **STOP and VALIDATE**: correr T003/T008 y confirmar visualmente antes de seguir
4. Completar Phase 4 (US2) — pulido de íconos/botón
5. Completar Phase 5 (US3) — documentación
6. Completar Phase 6 (Polish) — validación final completa
