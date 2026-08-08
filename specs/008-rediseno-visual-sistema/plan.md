# Implementation Plan: Rediseño visual del sistema (estilo mockup DentalPro)

**Branch**: `008-rediseno-visual-sistema` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-rediseno-visual-sistema/spec.md`

## Summary

Corregir 4 bugs visuales concretos que quedaron de la primera pasada del rediseño (ícono de
configuración con figuras superpuestas, botón "+Nuevo paciente" con subrayado heredado del
`<a>`, `margin-left` duplicado entre `ShellLayout` y la página de Pacientes, y `TopAppBar`
desincronizado del estado de colapso de la sidebar), y formalizar el nuevo estilo visual
(paleta teal/cyan, tipografía Inter, sombras suaves, y los patrones de `TopAppBar`, tarjetas
de métricas, switch de pestañas y tabla moderna) como sección nueva y versionada de
`docs/design-system.md`, por mandato de Principio VI de la constitución. El enfoque técnico
central: mover la fuente de verdad del estado `colapsada` de la sidebar a un contexto de React
provisto por `ShellLayout`, para que cualquier elemento `position:fixed` (como `TopAppBar`)
pueda sincronizarse con él sin duplicar lógica ni introducir otro `margin-left` por su cuenta.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router), React 19

**Primary Dependencies**: React Context API (nuevo `SidebarContext`), CSS Modules (sin
librería de CSS-in-JS ni Tailwind — el proyecto ya usa CSS Modules + tokens en
`globals.css`)

**Storage**: N/A — cambio puramente de presentación, no toca IndexedDB/Dexie ni Prisma/Postgres

**Testing**: Vitest (unit, ya en uso) + Playwright (e2e, ya en uso) — para esta ronda,
verificación principalmente visual (capturas antes/después) más una prueba e2e que cubra el
comportamiento de sincronización del layout al colapsar/expandir la sidebar

**Target Platform**: Web (navegador), mismo layout compartido usado en desktop/tablet/celular

**Project Type**: Web application (Next.js single codebase, ya ratificado)

**Performance Goals**: N/A — sin impacto de performance esperado (cambios de CSS y de dónde
vive un booleano de estado ya existente)

**Constraints**: Debe mantener la transición suave de 200ms ya existente entre sidebar y
contenido (`prefers-reduced-motion` ya respetado, no se debe romper); debe seguir funcionando
en el breakpoint de tablet (<1024px, sidebar angosta a 64px) y en el de celular (<640px,
sidebar como barra inferior) sin reintroducir el bug de espacio en blanco en ninguno

**Scale/Scope**: 1 componente compartido nuevo/modificado (`ShellLayout` + nuevo contexto), 1
componente existente corregido (`TopAppBar`), 1 página corregida (`/pacientes`), 1 documento
actualizado (`docs/design-system.md`) — no se tocan otras pantallas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio VI (UI Consistency, Responsive Design & Design System Discipline) —
  NON-NEGOTIABLE**: Es el principio central de esta spec. El plan actualiza
  `docs/design-system.md` como parte del propio trabajo (FR-006, FR-007), no como un paso
  posterior — cumple el mandato de "debe extenderse, no bypasearse, antes de que una feature
  introduzca una categoría de componente o token que todavía no cubre". El comportamiento
  responsive existente (breakpoints de tablet/celular ya implementados en `Sidebar.module.css`
  y `shell.module.css`) se preserva explícitamente (ver Edge Cases de spec.md) — PASA.
- **Principio V (Simplicity & YAGNI)**: Se evaluaron dos alternativas para sincronizar
  `TopAppBar` con el colapso de la sidebar (mover `TopAppBar` al propio `ShellLayout` vs.
  exponer el estado vía contexto de React). Se elige contexto de React porque `TopAppBar` ya
  varía su contenido por página (buscador con placeholder distinto, botón de acción distinto
  por pantalla) — moverlo al layout obligaría a introducir una API de "slots"/props
  configurables por ruta *ahora*, para un caso de uso (más pantallas con `TopAppBar`) que
  todavía no existe fuera de Pacientes. Un contexto que solo expone un booleano ya calculado
  es la abstracción mínima que resuelve el bug sin anticipar esa necesidad — PASA.
- **Principio II (Layered Architecture)**: No aplica de forma directa — este cambio vive
  enteramente en la capa de presentación (componentes de UI compartidos + CSS), no toca
  dominio, casos de uso ni infraestructura. No hay violación posible.
- Resto de principios (I, III, IV, VII, VIII): no aplican — no hay lógica de negocio, datos
  clínicos, autenticación ni acceso a datos involucrados en este cambio.

No se identifican violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-rediseno-visual-sistema/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `data-model.md` ni `contracts/` — esta feature no introduce entidades de datos ni
interfaces externas (spec.md, Key Entities: "No aplica").

### Source Code (repository root)

Proyecto único Next.js (App Router) ya existente — no se crean carpetas nuevas de alto nivel,
solo se modifican/agregan archivos dentro de la estructura ya establecida:

```text
src/
├── app/
│   └── (shell)/
│       ├── layout.tsx            # MODIFICAR: crear y proveer SidebarContext
│       ├── shell.module.css      # sin cambios (ya correcto)
│       └── pacientes/
│           ├── page.tsx          # sin cambios funcionales
│           └── pacientes.module.css  # MODIFICAR: quitar margin-left duplicado de .main
├── components/
│   └── ui/
│       ├── Sidebar.tsx           # sin cambios (ya expone el estado que se movería al contexto)
│       ├── SidebarContext.tsx    # NUEVO: contexto + hook useSidebarColapsada()
│       ├── TopAppBar.tsx         # MODIFICAR: ícono de settings, fix subrayado del Link
│       └── TopAppBar.module.css  # MODIFICAR: leer estado colapsado vía clase condicional
└── ...

docs/
└── design-system.md              # MODIFICAR: nueva sección versionada (paleta, tipografía,
                                     sombras, TopAppBar, tarjetas de métricas, switch-tabs,
                                     tabla moderna) + nota de qué pantallas ya migraron

tests/
└── e2e/
    └── layout-sidebar-topappbar.spec.ts  # NUEVO: cubre sincronización sidebar/TopAppBar/contenido
```

**Structure Decision**: Se reutiliza la estructura ya existente del proyecto
(`src/app/(shell)/`, `src/components/ui/`, `docs/design-system.md`, `tests/e2e/`). No se
introduce ningún directorio nuevo de alto nivel — el único archivo nuevo es
`SidebarContext.tsx`, ubicado junto a `Sidebar.tsx` porque es estado que le pertenece
conceptualmente a ese componente, simplemente expuesto para que otros lo consuman.

## Complexity Tracking

*Sin violaciones que justificar — ver Constitution Check arriba.*
