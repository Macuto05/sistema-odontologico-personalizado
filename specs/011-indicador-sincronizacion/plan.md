# Implementation Plan: Indicador de Estado de Sincronización

**Branch**: `011-indicador-sincronizacion` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-indicador-sincronizacion/spec.md`

## Summary

Un indicador visual (`SyncStatusPill`) en la esquina superior derecha, presente en todas las
pantallas del área autenticada, que refleja el estado del motor de sincronización offline-first
ya existente (`src/infrastructure/sync/`): sin conexión, sincronizando (con % durante el push,
sin % durante el pull), con conflicto, o al día. No introduce ninguna tabla, endpoint ni
dependencia nueva — deriva su estado de datos que el sistema ya genera (outbox de Dexie,
eventos `online`/`offline` del navegador) más un store efímero en memoria para el progreso del
push, que hoy el motor de sync no expone hacia la UI.

## Technical Context

**Language/Version**: TypeScript, Next.js (App Router) — stack ya ratificado, sin cambios.

**Primary Dependencies**: React (vía Next.js), Dexie.js + `dexie-react-hooks` (`useLiveQuery`,
ya usado en `configuracion/page.tsx`). Sin dependencias nuevas.

**Storage**: IndexedDB vía Dexie, tabla `outboxOperations` (ya existe, `estado` ya indexado) y
una fila nueva en `metaSync` (tabla ya existente, sin bump de versión de esquema). El progreso
del push es efímero, en memoria — no se persiste.

**Testing**: Vitest (unit, para `derivarEstadoSync()` y el store `syncStatus.ts` — ambos son
lógica pura en memoria) y Playwright (e2e, contra build de producción, `context.setOffline()`
— mismo patrón que `tests/e2e/offline-sync.spec.ts` — para todo lo que toca IndexedDB real: la
transición offline→online visible en pantalla y el watermark de última sincronización).
El proyecto no tiene `fake-indexeddb` instalado; lo que toca Dexie se valida en navegador real
vía Playwright, no con un shim en Vitest.

**Target Platform**: Web responsive (phone/tablet/desktop), PWA — mismo target que el resto
del sistema.

**Project Type**: Web app (Next.js, codebase único front + API routes).

**Performance Goals**: el cambio de estado debe reflejarse en la UI sin demora perceptible
tras el evento que lo origina (evento de red, cambio en `outboxOperations`, tick del store de
progreso) — sin agregar ninguna llamada de red ni polling nuevo (research.md #6).

**Constraints**: debe funcionar sin conexión (es, en parte, lo que muestra); no debe bloquear
el hilo principal; no debe introducir polling donde ya existe un evento nativo o una
suscripción reactiva (Principio VIII).

**Scale/Scope**: un componente presentacional + un hook + un store chico en infraestructura;
2 puntos de montaje (`TopAppBar`, `ShellLayout`) cubriendo las ~10 pantallas del área
autenticada.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First**: PASS (con compromiso). `derivarEstadoSync()` es una función pura —
  se escriben sus tests (Vitest) antes de implementarla, cubriendo las 4 transiciones y su
  prioridad (FR-009). El store de progreso y el nuevo watermark también llevan tests de
  integración antes de la implementación, per Principio I.
- **II. Layered Architecture**: PASS. `syncStatus.ts` y `derivarEstadoSync()` viven en
  `src/infrastructure/sync/` (junto a `syncEngine.ts`/`outboxQueue.ts`), sin imports de React
  — el hook `useSyncStatus` (`src/hooks/`) es la única pieza que depende de React y de la
  infraestructura, y el componente `SyncStatusPill` (`src/components/ui/`) solo depende del
  hook. Dependencias hacia adentro, sin ciclos.
- **III. Data Integrity & Auditability**: N/A / PASS — la feature es de solo lectura respecto
  a datos clínicos; la única escritura nueva es un timestamp de bookkeeping
  (`metaSync`), no un registro clínico o financiero.
- **IV. Role-Based Access Control**: N/A / PASS — no agrega endpoints ni acciones nuevas;
  vive enteramente dentro del área ya autenticada (`(shell)`), reutilizando el mismo gate
  existente.
- **V. Simplicity & YAGNI**: PASS, con dos decisiones documentadas explícitamente para no
  sobre-diseñar (research.md #5, #7): el timestamp de "última sincronización" no rastrea
  éxito/fallo por sub-paso (no lo exige el requisito), y la detección de "pantalla sin
  `TopAppBar`" usa una lista de rutas explícita en vez de un mecanismo de señalización nuevo
  (Context) para un único consumidor.
- **VI. UI Consistency, Responsive Design & Design System Discipline**: PASS. Reutiliza los
  tokens de color ya ratificados (research.md #1) — no se toca `docs/design-system.md`. Se
  evaluó `Badge` antes de crear `SyncStatusPill` (research.md #2). Responsive: mismo
  breakpoint y criterio de colapso a solo-ícono que `TopAppBar.module.css` ya usa
  (research.md #8).
- **VII. Security & Vulnerability Prevention**: N/A / PASS — no hay input de usuario nuevo,
  no hay HTML sin escapar, no hay endpoints ni queries nuevas.
- **VIII. Performance & Efficient Data Access**: PASS — el estado se deriva de
  `useLiveQuery` (reactivo, sin polling) y de eventos nativos del navegador
  (`online`/`offline`, research.md #6); no se agrega ninguna llamada de red.

Sin violaciones — no aplica la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-indicador-sincronizacion/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

No se genera carpeta `contracts/`: la feature no expone ninguna interfaz externa nueva (no hay
endpoints de API nuevos) — mismo criterio que `007-tema-apariencia` y
`008-rediseno-visual-sistema`, las otras features puramente de UI del proyecto.

### Source Code (repository root)

```text
src/
├── infrastructure/
│   └── sync/
│       ├── syncEngine.ts        # existente — se extiende: listener 'offline', tracking de
│       │                        #   progreso durante el push, watermark general al final del ciclo
│       ├── outboxQueue.ts       # existente, sin cambios
│       ├── syncStatus.ts        # NUEVO — store en memoria del progreso del push (pub/sub)
│       └── derivarEstadoSync.ts # NUEVO — función pura: prioridad de estados (FR-009)
├── hooks/
│   └── useSyncStatus.ts         # NUEVO — combina navigator.onLine, useLiveQuery(outbox),
│                                 #   useSyncExternalStore(syncStatus) y derivarEstadoSync()
├── components/
│   └── ui/
│       ├── TopAppBar.tsx        # existente — se extiende: monta <SyncStatusPill /> en `.right`,
│       │                        #   antes del engranaje
│       ├── SyncStatusPill.tsx   # NUEVO — pill + panel desplegable
│       └── SyncStatusPill.module.css # NUEVO
└── app/
    └── (shell)/
        └── layout.tsx            # existente — se extiende: monta <SyncStatusPill /> en posición
                                   #   fija cuando la ruta actual no tiene TopAppBar (research.md #7)

tests/
├── unit/
│   ├── derivarEstadoSync.test.ts       # NUEVO
│   └── syncStatus.test.ts              # NUEVO (store de progreso, sin Dexie)
└── e2e/
    └── sync-status-pill.spec.ts        # NUEVO (offline/online, progreso, conflicto — navegador real)
```

**Structure Decision**: se reutiliza la arquitectura en capas ya establecida
(`infrastructure/` → `hooks/` → `components/ui/`), sin crear ninguna carpeta nueva de nivel
superior. `SyncStatusPill` es un componente único con dos puntos de montaje (`TopAppBar` y
`ShellLayout`), no dos componentes distintos — evita duplicar la lógica de estado/estilo
(research.md #7).
